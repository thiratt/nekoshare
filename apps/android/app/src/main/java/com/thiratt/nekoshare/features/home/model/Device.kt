package com.thiratt.nekoshare.features.home.model

enum class DeviceType { Windows, Android, Website }
enum class DeviceStatus { Online, Offline, Current }

data class DeviceItem(
    val id: String,
    val name: String,
    val appName: String,
    val appVersion: String,
    val type: DeviceType,
    val status: DeviceStatus,
    val ipAddress: String,
    val location: String = "ไม่ทราบ",
    val lastSeen: String
)
