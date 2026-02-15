package com.thiratt.nekoshare.core.navigation

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

sealed interface Route : NavKey

@Serializable sealed interface AuthRoute : Route
@Serializable data object Welcome : AuthRoute
@Serializable data object Login : AuthRoute
@Serializable data object Signup : AuthRoute
@Serializable data object ForgotPassword : AuthRoute

@Serializable sealed interface HomeRoute : Route
@Serializable data object HomeRoot : HomeRoute
@Serializable data object AddFriends : HomeRoute
@Serializable data object ManageFriends : HomeRoute
@Serializable data object Notifications : HomeRoute
@Serializable data class TransferItem(val transferId: String) : HomeRoute

@Serializable sealed interface SettingsRoute : Route
@Serializable data object SettingsRoot : SettingsRoute
@Serializable data object SettingsAccessibility : SettingsRoute
@Serializable data object SettingsEditProfile : SettingsRoute
@Serializable data object SettingsNotifications : SettingsRoute
@Serializable data object SettingsPrivacyAndSecurity : SettingsRoute
@Serializable data object SettingsStorageAndData : SettingsRoute
@Serializable data object SettingsAbout : SettingsRoute