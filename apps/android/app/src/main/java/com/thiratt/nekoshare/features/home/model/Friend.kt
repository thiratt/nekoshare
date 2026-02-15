package com.thiratt.nekoshare.features.home.model

enum class FriendStatus {
    Friend,
    Incoming,
    Outgoing,
    Blocked
}

data class Friend(
    val id: String,
    val name: String,
    val username: String,
    val avatarUrl: String? = null,
    val status: FriendStatus,
    val isOnline: Boolean = false,
    val lastSeen: String = ""
)