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
    ): EmailLoginResult {
        val requestBody = JSONObject()
        requestBody.put("email", email.trim())
        requestBody.put("password", password)

        return authenticateEmailFlow(
            path = "/auth/sign-in/email",
            requestBody = requestBody
        ) { responseCode, responseJson ->
            mapLoginError(responseCode, responseJson)
        }
    }

    suspend fun signUpWithEmail(
        name: String,
        email: String,
        password: String
    ): EmailLoginResult {
        val requestBody = JSONObject()
        requestBody.put("name", name.trim())
        requestBody.put("username", buildUsername(name, email))
        requestBody.put("email", email.trim())
        requestBody.put("password", password)

        return authenticateEmailFlow(
            path = "/auth/sign-up/email",
            requestBody = requestBody
        ) { responseCode, responseJson ->
            mapSignupError(responseCode, responseJson)
        }
    }

    suspend fun loginWithGoogleIdToken(
        idToken: String,
        flow: GoogleAuthFlow = GoogleAuthFlow.Login
    ): EmailLoginResult {
        return withContext(Dispatchers.IO) {
            try {
                val requestBody = JSONObject()
                requestBody.put("idToken", idToken)
                requestBody.put("flow", flow.queryValue)

                val response = executeRequest(
                    method = "POST",
                    path = "/auth/mobile/google",
                    requestBody = requestBody.toString()
                )
                val responseJson = parseJsonBody(response.body)

                if (response.code !in 200..299) {
                    EmailLoginResult.Failure(mapGoogleAuthError(response.code, responseJson))
                } else {
                    val session = extractMobileGoogleSession(responseJson)
                    if (session == null) {
                        EmailLoginResult.Failure("เซิร์ฟเวอร์ไม่ส่งข้อมูลเซสชันกลับมา")
                    } else {
                        finalizeAuthenticatedSession(session)
                    }
                }
            } catch (_: Exception) {
                EmailLoginResult.Failure("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง")
            }
        }
    }

    suspend fun restoreSession(): SessionRestoreResult {
        return withContext(Dispatchers.IO) {
            val savedSession = readSavedSession()
            if (savedSession == null) {
                SessionRestoreResult.SignedOut
            } else {
                try {
                    val response = executeRequest(
                        method = "GET",
                        path = "/account/session",
                        bearerToken = savedSession.token
                    )

                    if (response.code in 200..299) {
                        val responseJson = parseJsonBody(response.body)
                        val dataJson = responseJson?.optJSONObject("data")
                        val userJson = dataJson?.optJSONObject("user")

                        val refreshedSession = savedSession.copy(
                            userId = readJsonString(userJson, "id") ?: savedSession.userId,
                            email = readJsonString(userJson, "email") ?: savedSession.email,
                            name = readJsonString(userJson, "name") ?: savedSession.name,
                            deviceId = readJsonString(userJson, "deviceId") ?: savedSession.deviceId
                        )

                        saveSession(refreshedSession)
                        SessionRestoreResult.Authenticated(refreshedSession)
                    } else if (
                        response.code == HttpURLConnection.HTTP_UNAUTHORIZED ||
                        response.code == HttpURLConnection.HTTP_FORBIDDEN
                    ) {
                        clearSavedSession()
                        SessionRestoreResult.SignedOut
                    } else {
                        SessionRestoreResult.Authenticated(savedSession)
                    }
                } catch (_: Exception) {
                    SessionRestoreResult.Authenticated(savedSession)
                }
            }
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

    fun getSavedSessionSnapshot(): SavedAuthSession? {
        return readSavedSession()
    }

    private suspend fun authenticateEmailFlow(
        path: String,
        requestBody: JSONObject,
        errorMapper: (responseCode: Int, responseJson: JSONObject?) -> String
    ): EmailLoginResult {
        return withContext(Dispatchers.IO) {
            try {
                val response = executeRequest(
                    method = "POST",
                    path = path,
                    requestBody = requestBody.toString()
                )
                val responseJson = parseJsonBody(response.body)

                if (response.code !in 200..299) {
                    EmailLoginResult.Failure(errorMapper(response.code, responseJson))
                } else {
                    val session = extractSession(responseJson)
                    if (session == null) {
                        EmailLoginResult.Failure("เซิร์ฟเวอร์ไม่ส่งโทเค็นเซสชันกลับมา")
                    } else {
                        finalizeAuthenticatedSession(session)
                    }
                }
            } catch (_: Exception) {
                EmailLoginResult.Failure("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง")
            }
        }
    }

    private fun finalizeAuthenticatedSession(session: SavedAuthSession): EmailLoginResult {
        val registrationResult = registerCurrentDevice(session.token)
        return when (registrationResult) {
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
        val connection = url.openConnection() as HttpURLConnection

        connection.requestMethod = method
        connection.connectTimeout = 15_000
        connection.readTimeout = 15_000
        connection.doInput = true
        connection.doOutput = requestBody != null
        connection.setRequestProperty("Accept", "application/json")

        if (requestBody != null) {
            connection.setRequestProperty("Content-Type", "application/json")
        }

        if (!bearerToken.isNullOrBlank()) {
            connection.setRequestProperty("Authorization", "Bearer $bearerToken")
        }

        try {
            if (requestBody != null) {
                connection.outputStream.use { output ->
                    output.write(requestBody.toByteArray(StandardCharsets.UTF_8))
                }
            }

            val responseCode = connection.responseCode
            val responseStream = if (responseCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream
            }

            return HttpResponse(
                code = responseCode,
                body = readResponseBody(responseStream)
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

    private fun parseJsonBody(body: String?): JSONObject? {
        if (body.isNullOrBlank()) {
            return null
        }

        return try {
            JSONObject(body)
        } catch (_: Exception) {
            null
        }
    }

    private fun registerCurrentDevice(bearerToken: String): DeviceRegistrationResult {
        return try {
            val localDevice = getOrCreateLocalDeviceIdentity()
            val platformJson = JSONObject()
            platformJson.put("os", "android")

            val payload = JSONObject()
            payload.put("id", localDevice.id)
            payload.put("name", localDevice.name)
            payload.put("platform", platformJson)

            val response = executeRequest(
                method = "POST",
                path = "/devices/register",
                requestBody = payload.toString(),
                bearerToken = bearerToken
            )
            val responseJson = parseJsonBody(response.body)

            if (response.code !in 200..299) {
                DeviceRegistrationResult.Failure(
                    mapDeviceRegistrationError(response.code, responseJson)
                )
            } else {
                DeviceRegistrationResult.Success(extractRegisteredDeviceId(responseJson))
            }
        } catch (_: Exception) {
            DeviceRegistrationResult.Failure("ไม่สามารถลงทะเบียนอุปกรณ์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง")
        }
    }

    private fun getOrCreateLocalDeviceIdentity(): LocalDeviceIdentity {
        val storedId = readStoredNonBlank(KEY_LOCAL_DEVICE_ID)
        val storedName = readStoredNonBlank(KEY_LOCAL_DEVICE_NAME)

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

    private fun readStoredNonBlank(key: String): String? {
        val value = prefs.getString(key, null)
        if (value.isNullOrBlank()) {
            return null
        }

        return value
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
        val token = readJsonString(responseJson, "token")
        if (token == null) {
            return null
        }

        val userJson = responseJson?.optJSONObject("user")
        return SavedAuthSession(
            token = token,
            userId = readJsonString(userJson, "id"),
            email = readJsonString(userJson, "email"),
            name = readJsonString(userJson, "name"),
            deviceId = readJsonString(userJson, "deviceId")
        )
    }

    private fun extractMobileGoogleSession(responseJson: JSONObject?): SavedAuthSession? {
        val dataJson = responseJson?.optJSONObject("data")
        if (dataJson == null) {
            return null
        }

        val token = readJsonString(dataJson, "token")
        if (token == null) {
            return null
        }

        val userJson = dataJson.optJSONObject("user")
        return SavedAuthSession(
            token = token,
            userId = readJsonString(userJson, "id"),
            email = readJsonString(userJson, "email"),
            name = readJsonString(userJson, "name"),
            deviceId = readJsonString(userJson, "deviceId")
        )
    }

    private fun extractRegisteredDeviceId(responseJson: JSONObject?): String? {
        val dataJson = responseJson?.optJSONObject("data")
        val deviceJson = dataJson?.optJSONObject("device")
        return readJsonString(deviceJson, "id")
    }

    private fun readJsonString(json: JSONObject?, key: String): String? {
        if (json == null) {
            return null
        }

        val value = json.optString(key)
        if (value.isBlank()) {
            return null
        }

        return value
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
        val translatedMessage = translateServerMessage(message)

        return when {
            translatedMessage != null -> translatedMessage
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
        val token = prefs.getString(KEY_TOKEN, null)
        if (token == null) {
            return null
        }

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
        val translatedMessage = translateServerMessage(message)

        return when {
            message.contains("already exists", ignoreCase = true) ||
                message.contains("already in use", ignoreCase = true) -> "อีเมลนี้ถูกใช้งานแล้ว"

            translatedMessage != null -> translatedMessage
            responseCode >= 500 -> "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่ภายหลัง"
            else -> "ไม่สามารถสร้างบัญชีได้ในขณะนี้"
        }
    }

    private fun fallbackMessage(
        responseCode: Int,
        message: String
    ): String {
        val translatedMessage = translateServerMessage(message)

        return when {
            translatedMessage != null -> translatedMessage
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
