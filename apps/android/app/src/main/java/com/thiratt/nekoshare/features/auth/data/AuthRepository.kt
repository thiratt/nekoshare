package com.thiratt.nekoshare.features.auth.data

import android.content.Context
import android.os.Build
import androidx.core.content.edit
import com.thiratt.nekoshare.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.util.UUID

private const val AUTH_PREFS = "nekoshare_auth"
private const val KEY_TOKEN = "session_token"
private const val KEY_USER_ID = "user_id"
private const val KEY_USER_EMAIL = "user_email"
private const val KEY_USER_NAME = "user_name"
private const val KEY_DEVICE_ID = "device_id"
private const val KEY_LOCAL_DEVICE_ID = "local_device_id"
private const val KEY_LOCAL_DEVICE_NAME = "local_device_name"

data class SavedAuthSession(
    val token: String,
    val userId: String?,
    val email: String?,
    val name: String?,
    val deviceId: String?
)

sealed interface EmailLoginResult {
    data class Success(val session: SavedAuthSession) : EmailLoginResult

    data class Failure(val message: String) : EmailLoginResult
}

sealed interface SessionRestoreResult {
    data class Authenticated(val session: SavedAuthSession) : SessionRestoreResult

    data object SignedOut : SessionRestoreResult
}

private data class HttpResponse(
    val code: Int,
    val body: String?
)

private data class LocalDeviceIdentity(
    val id: String,
    val name: String
)

private sealed interface DeviceRegistrationResult {
    data class Success(val deviceId: String?) : DeviceRegistrationResult

    data class Failure(val message: String) : DeviceRegistrationResult
}

class AuthRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences(AUTH_PREFS, Context.MODE_PRIVATE)

    suspend fun loginWithEmail(
        email: String,
        password: String
    ): EmailLoginResult = authenticateEmailFlow(
        path = "/auth/sign-in/email",
        requestBody = JSONObject()
            .put("email", email.trim())
            .put("password", password)
    ) { responseCode, responseJson ->
        mapLoginError(responseCode, responseJson)
    }

    suspend fun signUpWithEmail(
        name: String,
        email: String,
        password: String
    ): EmailLoginResult = authenticateEmailFlow(
        path = "/auth/sign-up/email",
        requestBody = JSONObject()
            .put("name", name.trim())
            .put("username", buildUsername(name, email))
            .put("email", email.trim())
            .put("password", password)
    ) { responseCode, responseJson ->
        mapSignupError(responseCode, responseJson)
    }

    suspend fun loginWithGoogleIdToken(
        idToken: String,
        flow: GoogleAuthFlow = GoogleAuthFlow.Login
    ): EmailLoginResult = withContext(Dispatchers.IO) {
        return@withContext try {
            val response = executeRequest(
                method = "POST",
                path = "/auth/mobile/google",
                requestBody = JSONObject()
                    .put("idToken", idToken)
                    .put("flow", flow.queryValue)
                    .toString()
            )

            val responseJson = response.body
                ?.takeIf { it.isNotBlank() }
                ?.let { body -> runCatching { JSONObject(body) }.getOrNull() }

            if (response.code !in 200..299) {
                return@withContext EmailLoginResult.Failure(mapGoogleAuthError(response.code, responseJson))
            }

            val session = extractMobileGoogleSession(responseJson)
                ?: return@withContext EmailLoginResult.Failure("เซิร์ฟเวอร์ไม่ส่งข้อมูลเซสชันกลับมา")

            finalizeAuthenticatedSession(session)
        } catch (_: Exception) {
            EmailLoginResult.Failure("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง")
        }
    }

    suspend fun restoreSession(): SessionRestoreResult = withContext(Dispatchers.IO) {
        val savedSession = readSavedSession() ?: return@withContext SessionRestoreResult.SignedOut

        return@withContext try {
            val response = executeRequest(
                method = "GET",
                path = "/account/session",
                bearerToken = savedSession.token
            )

            when {
                response.code in 200..299 -> {
                    val responseJson = response.body
                        ?.takeIf { it.isNotBlank() }
                        ?.let(::JSONObject)

                    val dataJson = responseJson?.optJSONObject("data")
                    val userJson = dataJson?.optJSONObject("user")

                    val refreshedSession = savedSession.copy(
                        userId = userJson?.optString("id")?.takeIf { it.isNotBlank() } ?: savedSession.userId,
                        email = userJson?.optString("email")?.takeIf { it.isNotBlank() } ?: savedSession.email,
                        name = userJson?.optString("name")?.takeIf { it.isNotBlank() } ?: savedSession.name,
                        deviceId = userJson?.optString("deviceId")?.takeIf { it.isNotBlank() } ?: savedSession.deviceId
                    )

                    saveSession(refreshedSession)
                    SessionRestoreResult.Authenticated(refreshedSession)
                }

                response.code == HttpURLConnection.HTTP_UNAUTHORIZED ||
                    response.code == HttpURLConnection.HTTP_FORBIDDEN -> {
                    clearSavedSession()
                    SessionRestoreResult.SignedOut
                }

                else -> SessionRestoreResult.Authenticated(savedSession)
            }
        } catch (_: Exception) {
            SessionRestoreResult.Authenticated(savedSession)
        }
    }

    fun clearSavedSession() {
        prefs.edit {
            remove(KEY_TOKEN)
                .remove(KEY_USER_ID)
                .remove(KEY_USER_EMAIL)
                .remove(KEY_USER_NAME)
                .remove(KEY_DEVICE_ID)
        }
    }

    fun getSavedSessionSnapshot(): SavedAuthSession? = readSavedSession()

    private suspend fun authenticateEmailFlow(
        path: String,
        requestBody: JSONObject,
        errorMapper: (responseCode: Int, responseJson: JSONObject?) -> String
    ): EmailLoginResult = withContext(Dispatchers.IO) {
        return@withContext try {
            val response = executeRequest(
                method = "POST",
                path = path,
                requestBody = requestBody.toString()
            )

            val responseJson = response.body
                ?.takeIf { it.isNotBlank() }
                ?.let { body -> runCatching { JSONObject(body) }.getOrNull() }

            if (response.code !in 200..299) {
                return@withContext EmailLoginResult.Failure(errorMapper(response.code, responseJson))
            }

            val session = extractSession(responseJson)
                ?: return@withContext EmailLoginResult.Failure("เซิร์ฟเวอร์ไม่ส่งโทเค็นเซสชันกลับมา")

            finalizeAuthenticatedSession(session)
        } catch (_: Exception) {
            EmailLoginResult.Failure("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง")
        }
    }

    private fun finalizeAuthenticatedSession(session: SavedAuthSession): EmailLoginResult {
        return when (val registrationResult = registerCurrentDevice(session.token)) {
            is DeviceRegistrationResult.Success -> {
                val updatedSession = session.copy(
                    deviceId = registrationResult.deviceId ?: session.deviceId
                )
                saveSession(updatedSession)
                EmailLoginResult.Success(updatedSession)
            }

            is DeviceRegistrationResult.Failure -> EmailLoginResult.Failure(registrationResult.message)
        }
    }

    private fun executeRequest(
        method: String,
        path: String,
        requestBody: String? = null,
        bearerToken: String? = null
    ): HttpResponse {
        val baseUrl = BuildConfig.API_BASE_URL.removeSuffix("/")
        val url = URL("$baseUrl$path")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 15_000
            doInput = true
            doOutput = requestBody != null
            setRequestProperty("Accept", "application/json")

            if (requestBody != null) {
                setRequestProperty("Content-Type", "application/json")
            }

            if (!bearerToken.isNullOrBlank()) {
                setRequestProperty("Authorization", "Bearer $bearerToken")
            }
        }

        try {
            if (requestBody != null) {
                connection.outputStream.use { output ->
                    output.write(requestBody.toByteArray(StandardCharsets.UTF_8))
                }
            }

            val responseCode = connection.responseCode
            val responseBody = readResponseBody(
                if (responseCode in 200..299) connection.inputStream else connection.errorStream
            )

            return HttpResponse(
                code = responseCode,
                body = responseBody
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun readResponseBody(stream: InputStream?): String? {
        if (stream == null) {
            return null
        }

        return stream.use { input ->
            BufferedReader(InputStreamReader(input, StandardCharsets.UTF_8)).use { reader ->
                reader.readText()
            }
        }
    }

    private fun registerCurrentDevice(bearerToken: String): DeviceRegistrationResult {
        return try {
            val localDevice = getOrCreateLocalDeviceIdentity()
            val payload = JSONObject()
                .put("id", localDevice.id)
                .put("name", localDevice.name)
                .put(
                    "platform",
                    JSONObject().put("os", "android")
                )

            val response = executeRequest(
                method = "POST",
                path = "/devices/register",
                requestBody = payload.toString(),
                bearerToken = bearerToken
            )

            val responseJson = response.body
                ?.takeIf { it.isNotBlank() }
                ?.let { body -> runCatching { JSONObject(body) }.getOrNull() }

            if (response.code !in 200..299) {
                return DeviceRegistrationResult.Failure(
                    mapDeviceRegistrationError(response.code, responseJson)
                )
            }

            DeviceRegistrationResult.Success(extractRegisteredDeviceId(responseJson))
        } catch (_: Exception) {
            DeviceRegistrationResult.Failure("ไม่สามารถลงทะเบียนอุปกรณ์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง")
        }
    }

    private fun getOrCreateLocalDeviceIdentity(): LocalDeviceIdentity {
        val storedId = prefs.getString(KEY_LOCAL_DEVICE_ID, null)
            ?.takeIf { it.isNotBlank() }
        val storedName = prefs.getString(KEY_LOCAL_DEVICE_NAME, null)
            ?.takeIf { it.isNotBlank() }

        val localDeviceId = storedId ?: UUID.randomUUID().toString()
        val localDeviceName = storedName ?: buildDefaultDeviceName()

        if (storedId == null || storedName == null) {
            prefs.edit {
                putString(KEY_LOCAL_DEVICE_ID, localDeviceId)
                    .putString(KEY_LOCAL_DEVICE_NAME, localDeviceName)
            }
        }

        return LocalDeviceIdentity(
            id = localDeviceId,
            name = localDeviceName
        )
    }

    private fun buildDefaultDeviceName(): String {
        val manufacturer = Build.MANUFACTURER?.trim().orEmpty()
        val model = Build.MODEL?.trim().orEmpty()

        val rawName = when {
            manufacturer.isBlank() && model.isBlank() -> "Android Device"
            manufacturer.isBlank() -> model
            model.isBlank() -> manufacturer
            model.startsWith(manufacturer, ignoreCase = true) -> model
            else -> "$manufacturer $model"
        }

        return rawName
            .split(Regex("\\s+"))
            .filter { it.isNotBlank() }
            .joinToString(" ") { part ->
                part.replaceFirstChar { char ->
                    if (char.isLowerCase()) {
                        char.titlecase()
                    } else {
                        char.toString()
                    }
                }
            }
            .ifBlank { "Android Device" }
    }

    private fun extractSession(responseJson: JSONObject?): SavedAuthSession? {
        val token = responseJson?.optString("token")?.takeIf { it.isNotBlank() } ?: return null
        val userJson = responseJson.optJSONObject("user")

        return SavedAuthSession(
            token = token,
            userId = userJson?.optString("id")?.takeIf { it.isNotBlank() },
            email = userJson?.optString("email")?.takeIf { it.isNotBlank() },
            name = userJson?.optString("name")?.takeIf { it.isNotBlank() },
            deviceId = userJson?.optString("deviceId")?.takeIf { it.isNotBlank() }
        )
    }

    private fun extractMobileGoogleSession(responseJson: JSONObject?): SavedAuthSession? {
        val dataJson = responseJson?.optJSONObject("data") ?: return null
        val token = dataJson.optString("token").takeIf { !it.isNullOrBlank() } ?: return null
        val userJson = dataJson.optJSONObject("user")

        return SavedAuthSession(
            token = token,
            userId = userJson?.optString("id")?.takeIf { it.isNotBlank() },
            email = userJson?.optString("email")?.takeIf { it.isNotBlank() },
            name = userJson?.optString("name")?.takeIf { it.isNotBlank() },
            deviceId = userJson?.optString("deviceId")?.takeIf { it.isNotBlank() }
        )
    }

    private fun extractRegisteredDeviceId(responseJson: JSONObject?): String? {
        return responseJson
            ?.optJSONObject("data")
            ?.optJSONObject("device")
            ?.optString("id")
            ?.takeIf { it.isNotBlank() }
    }

    private fun mapGoogleAuthError(
        responseCode: Int,
        responseJson: JSONObject?
    ): String {
        val errorCode = responseJson?.optString("error").orEmpty()
        val message = responseJson?.optString("message").orEmpty()

        return getGoogleAuthErrorMessage(errorCode)
            ?: getGoogleAuthErrorMessage(message)
            ?: fallbackMessage(responseCode, message)
    }

    private fun mapDeviceRegistrationError(
        responseCode: Int,
        responseJson: JSONObject?
    ): String {
        val message = responseJson?.optString("message").orEmpty()

        return when {
            translateServerMessage(message) != null -> translateServerMessage(message)!!
            responseCode >= 500 -> "ไม่สามารถลงทะเบียนอุปกรณ์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"
            else -> "ไม่สามารถลงทะเบียนอุปกรณ์ได้ในขณะนี้"
        }
    }

    private fun saveSession(session: SavedAuthSession) {
        prefs.edit {
            putString(KEY_TOKEN, session.token)
                .putString(KEY_USER_ID, session.userId)
                .putString(KEY_USER_EMAIL, session.email)
                .putString(KEY_USER_NAME, session.name)
                .putString(KEY_DEVICE_ID, session.deviceId)
        }
    }

    private fun readSavedSession(): SavedAuthSession? {
        val token = prefs.getString(KEY_TOKEN, null) ?: return null

        return SavedAuthSession(
            token = token,
            userId = prefs.getString(KEY_USER_ID, null),
            email = prefs.getString(KEY_USER_EMAIL, null),
            name = prefs.getString(KEY_USER_NAME, null),
            deviceId = prefs.getString(KEY_DEVICE_ID, null)
        )
    }

    private fun buildUsername(
        name: String,
        email: String
    ): String {
        val preferredBase = sanitizeUsername(name)
        val emailBase = sanitizeUsername(email.substringBefore("@"))
        val suffix = Integer.toHexString(email.trim().lowercase().hashCode())
            .removePrefix("-")
            .takeLast(4)
            .ifBlank { "user" }

        val base = preferredBase.ifBlank {
            emailBase.ifBlank { "member" }
        }

        val maxBaseLength = (20 - suffix.length - 1).coerceAtLeast(2)
        val normalizedBase = base.take(maxBaseLength).ifBlank { "member".take(maxBaseLength) }

        return "$normalizedBase-$suffix"
    }

    private fun sanitizeUsername(value: String): String {
        return value.trim()
            .lowercase()
            .replace(Regex("[^a-z0-9_.-]"), "")
            .trim('.', '-', '_')
    }

    private fun mapLoginError(
        responseCode: Int,
        responseJson: JSONObject?
    ): String {
        val errorCode = responseJson?.optString("code").orEmpty()
        val message = responseJson?.optString("message").orEmpty()

        return when (errorCode) {
            "INVALID_EMAIL_OR_PASSWORD" -> "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
            "EMAIL_NOT_VERIFIED" -> "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ"
            else -> fallbackMessage(responseCode, message)
        }
    }

    private fun mapSignupError(
        responseCode: Int,
        responseJson: JSONObject?
    ): String {
        val message = responseJson?.optString("message").orEmpty()

        return when {
            message.contains("already exists", ignoreCase = true) ||
                message.contains("already in use", ignoreCase = true) -> "อีเมลนี้ถูกใช้งานแล้ว"

            translateServerMessage(message) != null -> translateServerMessage(message)!!
            responseCode >= 500 -> "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่ภายหลัง"
            else -> "ไม่สามารถสร้างบัญชีได้ในขณะนี้"
        }
    }

    private fun fallbackMessage(
        responseCode: Int,
        message: String
    ): String {
        return when {
            translateServerMessage(message) != null -> translateServerMessage(message)!!
            responseCode >= 500 -> "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่ภายหลัง"
            else -> "ไม่สามารถเข้าสู่ระบบได้ในขณะนี้"
        }
    }

    private fun translateServerMessage(message: String): String? {
        val normalized = message.trim().lowercase()
        if (normalized.isBlank()) {
            return null
        }

        return when {
            normalized.contains("already exists") ||
                normalized.contains("already in use") -> "อีเมลนี้ถูกใช้งานแล้ว"

            normalized.contains("invalid email or password") -> "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
            normalized.contains("email not verified") -> "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ"
            normalized.contains("unable to create") && normalized.contains("account") -> "ไม่สามารถสร้างบัญชีได้ในขณะนี้"
            normalized.contains("device") && normalized.contains("register") -> "ไม่สามารถลงทะเบียนอุปกรณ์ได้ในขณะนี้"
            normalized.contains("invalid google id token") -> "การยืนยันตัวตนด้วย Google ไม่ถูกต้อง"
            normalized.contains("token expired") -> "เซสชันหมดอายุแล้ว กรุณาลองใหม่อีกครั้ง"
            normalized.contains("unable to reach the server") ||
                normalized.contains("network error") -> "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"

            else -> null
        }
    }
}
