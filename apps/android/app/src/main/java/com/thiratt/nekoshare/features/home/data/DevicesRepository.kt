package com.thiratt.nekoshare.features.home.data

import android.content.Context
import com.thiratt.nekoshare.BuildConfig
import com.thiratt.nekoshare.features.auth.data.AuthRepository
import com.thiratt.nekoshare.features.home.model.DeviceItem
import com.thiratt.nekoshare.features.home.model.DeviceStatus
import com.thiratt.nekoshare.features.home.model.DeviceType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.time.Instant

private const val DEVICES_PATH = "/devices"
private const val ONLINE_THRESHOLD_MILLIS = 60_000L
private const val UNKNOWN_VERSION = "ไม่ทราบเวอร์ชัน"
private const val UNKNOWN_IP = "ไม่ทราบ IP"
private const val UNKNOWN_LOCATION = "ไม่ทราบตำแหน่ง"

sealed interface DevicesLoadResult {
    data class Success(val devices: List<DeviceItem>) : DevicesLoadResult

    data class Failure(val message: String) : DevicesLoadResult
}

private data class HttpResponse(
    val code: Int,
    val body: String?
)

class DevicesRepository(context: Context) {
    private val appContext = context.applicationContext
    private val authRepository = AuthRepository(appContext)

    suspend fun fetchDevices(): DevicesLoadResult = withContext(Dispatchers.IO) {
        val session = authRepository.getSavedSessionSnapshot()
            ?: return@withContext DevicesLoadResult.Failure("ไม่พบข้อมูลการเข้าสู่ระบบ")

        return@withContext try {
            val response = executeRequest(
                method = "GET",
                path = DEVICES_PATH,
                bearerToken = session.token
            )

            val responseJson = response.body
                ?.takeIf { it.isNotBlank() }
                ?.let { body -> runCatching { JSONObject(body) }.getOrNull() }

            when {
                response.code in 200..299 -> {
                    DevicesLoadResult.Success(
                        parseDevices(
                            responseJson = responseJson,
                            currentDeviceId = session.deviceId
                        )
                    )
                }

                response.code == HttpURLConnection.HTTP_UNAUTHORIZED ||
                    response.code == HttpURLConnection.HTTP_FORBIDDEN -> {
                    DevicesLoadResult.Failure("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่")
                }

                else -> DevicesLoadResult.Failure(mapFetchDevicesError(response.code, responseJson))
            }
        } catch (_: Exception) {
            DevicesLoadResult.Failure("ไม่สามารถดึงรายการอุปกรณ์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง")
        }
    }

    private fun executeRequest(
        method: String,
        path: String,
        bearerToken: String
    ): HttpResponse {
        val baseUrl = BuildConfig.API_BASE_URL.removeSuffix("/")
        val url = URL("$baseUrl$path")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 15_000
            doInput = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Authorization", "Bearer $bearerToken")
        }

        try {
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

    private fun parseDevices(
        responseJson: JSONObject?,
        currentDeviceId: String?
    ): List<DeviceItem> {
        val devicesArray = responseJson
            ?.optJSONObject("data")
            ?.optJSONArray("devices")
            ?: JSONArray()

        val devices = buildList {
            for (index in 0 until devicesArray.length()) {
                val item = devicesArray.optJSONObject(index) ?: continue
                mapDevice(item, currentDeviceId)?.let(::add)
            }
        }

        return devices.sortedWith(
            compareByDescending<DeviceItem> { it.status == DeviceStatus.Current }
                .thenByDescending { it.status == DeviceStatus.Online }
                .thenBy { it.name.lowercase() }
        )
    }

    private fun mapDevice(
        deviceJson: JSONObject,
        currentDeviceId: String?
    ): DeviceItem? {
        val deviceId = deviceJson.optString("id").takeIf { it.isNotBlank() } ?: return null
        val name = deviceJson.optString("name").takeIf { it.isNotBlank() } ?: return null
        val platformOs = deviceJson
            .optJSONObject("platform")
            ?.optString("os")
            ?.trim()
            ?.lowercase()
            .orEmpty()
        val lastActiveAt = deviceJson.optString("lastActiveAt").takeIf { it.isNotBlank() }

        val type = when (platformOs) {
            "android" -> DeviceType.Android
            "windows" -> DeviceType.Windows
            "web" -> DeviceType.Website
            else -> DeviceType.Other
        }

        val status = when {
            currentDeviceId != null && deviceId == currentDeviceId -> DeviceStatus.Current
            isOnline(lastActiveAt) -> DeviceStatus.Online
            else -> DeviceStatus.Offline
        }

        return DeviceItem(
            id = deviceId,
            name = name,
            appName = getAppName(type),
            appVersion = if (status == DeviceStatus.Current && type == DeviceType.Android) {
                BuildConfig.VERSION_NAME
            } else {
                UNKNOWN_VERSION
            },
            type = type,
            status = status,
            ipAddress = UNKNOWN_IP,
            location = UNKNOWN_LOCATION,
            lastSeen = formatLastSeen(lastActiveAt, status)
        )
    }

    private fun getAppName(type: DeviceType): String {
        return when (type) {
            DeviceType.Android -> "NekoShare App"
            DeviceType.Windows -> "NekoShare Desktop"
            DeviceType.Website -> "NekoShare Web"
            DeviceType.Other -> "NekoShare"
        }
    }

    private fun isOnline(lastActiveAt: String?): Boolean {
        val lastSeen = parseInstant(lastActiveAt) ?: return false
        return (System.currentTimeMillis() - lastSeen.toEpochMilli()) < ONLINE_THRESHOLD_MILLIS
    }

    private fun formatLastSeen(
        lastActiveAt: String?,
        status: DeviceStatus
    ): String {
        if (status == DeviceStatus.Current || status == DeviceStatus.Online) {
            return "ออนไลน์"
        }

        val lastSeen = parseInstant(lastActiveAt) ?: return "ไม่ทราบ"
        val diffMillis = (System.currentTimeMillis() - lastSeen.toEpochMilli()).coerceAtLeast(0L)
        val minutes = diffMillis / 60_000L
        val hours = diffMillis / 3_600_000L
        val days = diffMillis / 86_400_000L

        return when {
            minutes < 1L -> "เห็นล่าสุดเมื่อสักครู่"
            minutes == 1L -> "เห็นล่าสุด 1 นาทีที่แล้ว"
            minutes < 60L -> "เห็นล่าสุด $minutes นาทีที่แล้ว"
            hours == 1L -> "เห็นล่าสุด 1 ชั่วโมงที่แล้ว"
            hours < 24L -> "เห็นล่าสุด $hours ชั่วโมงที่แล้ว"
            days == 1L -> "เห็นล่าสุด 1 วันที่แล้ว"
            days < 7L -> "เห็นล่าสุด $days วันที่แล้ว"
            else -> "ไม่ได้ใช้งานมาสักพัก"
        }
    }

    private fun parseInstant(value: String?): Instant? {
        if (value.isNullOrBlank()) {
            return null
        }

        return runCatching { Instant.parse(value) }.getOrNull()
    }

    private fun mapFetchDevicesError(
        responseCode: Int,
        responseJson: JSONObject?
    ): String {
        val message = responseJson?.optString("message").orEmpty()

        if (message.isNotBlank()) {
            return message
        }

        return if (responseCode >= 500) {
            "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่ภายหลัง"
        } else {
            "ไม่สามารถดึงรายการอุปกรณ์ได้ในขณะนี้"
        }
    }
}
