package com.thiratt.nekoshare.app.navigation

import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.navigation3.runtime.NavEntry
import androidx.navigation3.ui.NavDisplay
import com.thiratt.nekoshare.ThemeViewModel
import com.thiratt.nekoshare.constants.TransferRepository
import com.thiratt.nekoshare.core.navigation.AddFriends
import com.thiratt.nekoshare.core.navigation.ForgotPassword
import com.thiratt.nekoshare.core.navigation.HomeRoot
import com.thiratt.nekoshare.core.navigation.Login
import com.thiratt.nekoshare.core.navigation.ManageFriends
import com.thiratt.nekoshare.core.navigation.Notifications
import com.thiratt.nekoshare.core.navigation.SafeNavigator
import com.thiratt.nekoshare.core.navigation.SettingsAbout
import com.thiratt.nekoshare.core.navigation.SettingsAccessibility
import com.thiratt.nekoshare.core.navigation.SettingsEditProfile
import com.thiratt.nekoshare.core.navigation.SettingsNotifications
import com.thiratt.nekoshare.core.navigation.SettingsPrivacyAndSecurity
import com.thiratt.nekoshare.core.navigation.SettingsRoot
import com.thiratt.nekoshare.core.navigation.SettingsStorageAndData
import com.thiratt.nekoshare.core.navigation.Signup
import com.thiratt.nekoshare.core.navigation.Welcome
import com.thiratt.nekoshare.core.navigation.rememberSafeNavigator
import com.thiratt.nekoshare.features.auth.presentation.forgotpassword.ForgotPasswordNavEvent
import com.thiratt.nekoshare.features.auth.presentation.forgotpassword.ForgotPasswordRoute
import com.thiratt.nekoshare.features.auth.presentation.login.LoginNavEvent
import com.thiratt.nekoshare.features.auth.presentation.login.LoginRoute
import com.thiratt.nekoshare.features.auth.presentation.signup.SignupNavEvent
import com.thiratt.nekoshare.features.auth.presentation.signup.SignupRoute
import com.thiratt.nekoshare.features.auth.presentation.welcome.WelcomeRoute
import com.thiratt.nekoshare.features.home.presentation.AddFriendRoute
import com.thiratt.nekoshare.features.home.presentation.HomeNavEvent
import com.thiratt.nekoshare.features.home.presentation.HomeRoute
import com.thiratt.nekoshare.features.home.presentation.ManageFriendsRoute
import com.thiratt.nekoshare.features.notifications.presentation.NotificationsRoute
import com.thiratt.nekoshare.features.settings.presentation.AccessibilityRoute
import com.thiratt.nekoshare.features.settings.presentation.EditProfileRoute
import com.thiratt.nekoshare.features.settings.presentation.PrivacyAndSecurityRoute
import com.thiratt.nekoshare.features.settings.presentation.SettingsAboutNavEvent
import com.thiratt.nekoshare.features.settings.presentation.SettingsAboutRoute
import com.thiratt.nekoshare.features.settings.presentation.SettingsAccessibilityNavEvent
import com.thiratt.nekoshare.features.settings.presentation.SettingsEditProfileNavEvent
import com.thiratt.nekoshare.features.settings.presentation.SettingsNavEvent
import com.thiratt.nekoshare.features.settings.presentation.SettingsNotificationsNavEvent
import com.thiratt.nekoshare.features.settings.presentation.SettingsNotificationsRoute
import com.thiratt.nekoshare.features.settings.presentation.SettingsPrivacyAndSecurityNavEvent
import com.thiratt.nekoshare.features.settings.presentation.SettingsRoute
import com.thiratt.nekoshare.features.settings.presentation.SettingsStorageAndDataNavEvent
import com.thiratt.nekoshare.features.settings.presentation.StorageAndDataRoute
import com.thiratt.nekoshare.features.transferdetail.model.LayoutMode
import com.thiratt.nekoshare.features.transferdetail.model.TransferDetailNavEvent
import com.thiratt.nekoshare.features.transferdetail.model.TransferItem
import com.thiratt.nekoshare.features.transferdetail.model.TransferStatus
import com.thiratt.nekoshare.features.transferdetail.presentation.TransferDetailRoute
import java.io.File
import com.thiratt.nekoshare.core.navigation.TransferItem as TransferItemRoute

@Composable
fun AppNavGraph(
    themeViewModel: ThemeViewModel
) {
    val navigator = rememberSafeNavigator(Welcome)
    val backStack = navigator.backStack

    val enterTransition = (slideInHorizontally(tween(300)) { it / 2 } + fadeIn(tween(300)))
    val exitTransition = (slideOutHorizontally(tween(300)) { -it / 2 } + fadeOut(tween(300)))
    val popEnterTransition = (slideInHorizontally(tween(300)) { -it / 2 } + fadeIn(tween(300)))
    val popExitTransition = (slideOutHorizontally(tween(300)) { it / 2 } + fadeOut(tween(300)))

    NavDisplay(
        backStack = backStack,
        onBack = { navigator.pop() },
        transitionSpec = { enterTransition togetherWith exitTransition },
        popTransitionSpec = { popEnterTransition togetherWith popExitTransition },
        entryProvider = { key ->
            authNav(key, navigator)
                ?: homeNav(key, navigator)
                ?: settingsNav(key, navigator, themeViewModel)
                ?: error("Unknown route: $key")
        }
    )
}

fun authNav(key: Any, navigator: SafeNavigator): NavEntry<Any>? {
    return when (key) {
        is Welcome -> NavEntry(key) {
            WelcomeRoute(
                onNavigateToLogin = { navigator.push(Login) },
                onNavigateToRegister = { navigator.push(Signup) }
            )
        }

        is Login -> NavEntry(key) {
            LoginRoute(
                onNavigate = { event ->
                    when (event) {
                        LoginNavEvent.Back -> navigator.pop()
                        LoginNavEvent.Home -> navigator.setRoot(HomeRoot)
                        LoginNavEvent.ForgotPassword -> navigator.push(ForgotPassword)
                        LoginNavEvent.Signup -> navigator.navigateSingleTop(Signup)
                    }
                }
            )
        }

        is Signup -> NavEntry(key) {
            SignupRoute(
                onNavigate = { event ->
                    when (event) {
                        SignupNavEvent.Back -> navigator.pop()
                        SignupNavEvent.Login -> navigator.navigateSingleTop(Login)
                        SignupNavEvent.CreateAccount -> {}
                    }
                }
            )
        }

        is ForgotPassword -> NavEntry(key) {
            ForgotPasswordRoute(
                onNavigate = { event ->
                    when (event) {
                        ForgotPasswordNavEvent.Back -> navigator.pop()
                        ForgotPasswordNavEvent.Login -> navigator.pop()
                        ForgotPasswordNavEvent.ResetPassword -> {}
                    }
                }
            )
        }

        else -> null
    }
}

fun homeNav(key: Any, navigator: SafeNavigator): NavEntry<Any>? {
    return when (key) {
        is HomeRoot -> NavEntry(key) {
            HomeRoute(
                onNavigate = { event ->
                    when (event) {
                        HomeNavEvent.Settings -> navigator.push(SettingsRoot)
                        HomeNavEvent.AddFriends -> navigator.push(AddFriends)
                        HomeNavEvent.ManageFriends -> navigator.push(ManageFriends)
                        HomeNavEvent.Notifications -> navigator.push(Notifications)
                        HomeNavEvent.Share -> {}
                        is HomeNavEvent.TransferItem -> navigator.push(TransferItemRoute(event.transferId))
                    }
                }
            )
        }

        is AddFriends -> NavEntry(key) { AddFriendRoute(onNavigate = { navigator.pop() }) }
        is ManageFriends -> NavEntry(key) { ManageFriendsRoute(onNavigate = { navigator.pop() }) }
        is Notifications -> NavEntry(key) { NotificationsRoute(onNavigate = { navigator.pop() }) }

        is TransferItemRoute -> NavEntry(key) {
            val transferId = key.transferId

            val historyItem = remember(transferId) {
                TransferRepository.getTransferById(transferId)
                    ?: TransferRepository.mockTransfers.first()
            }

            val item = remember(historyItem) {
                TransferItem(
                    id = historyItem.id,
                    senderName = historyItem.senderName,
                    status = TransferStatus.Completed,
                    files = historyItem.files.map { fileDetail ->
                        File(fileDetail.name)
                    }
                )
            }

            val initialMode =
                if (historyItem.files.size > 1) LayoutMode.Grid else LayoutMode.Preview

            TransferDetailRoute(
                item = item,
                initialLayoutMode = initialMode,
                onNavigate = { event ->
                    when (event) {
                        TransferDetailNavEvent.Back -> navigator.pop()
                        TransferDetailNavEvent.Delete -> navigator.pop()
                    }
                }
            )
        }

        else -> null
    }
}

fun settingsNav(
    key: Any,
    navigator: SafeNavigator,
    themeViewModel: ThemeViewModel
): NavEntry<Any>? {
    return when (key) {
        is SettingsRoot -> NavEntry(key) {
            SettingsRoute(
                onNavigate = { event ->
                    when (event) {
                        SettingsNavEvent.Back -> navigator.pop()
                        SettingsNavEvent.Accessibility -> navigator.push(SettingsAccessibility)
                        SettingsNavEvent.EditProfile -> navigator.push(SettingsEditProfile)
                        SettingsNavEvent.Notifications -> navigator.push(SettingsNotifications)
                        SettingsNavEvent.PrivacyAndSecurity -> navigator.push(
                            SettingsPrivacyAndSecurity
                        )

                        SettingsNavEvent.StorageAndData -> navigator.push(SettingsStorageAndData)
                        SettingsNavEvent.About -> navigator.push(SettingsAbout)
                        SettingsNavEvent.Logout -> navigator.setRoot(Welcome)
                    }
                }
            )
        }

        is SettingsAccessibility -> NavEntry(key) {
            AccessibilityRoute(
                viewModel = themeViewModel,
                onNavigate = { event ->
                    when (event) {
                        SettingsAccessibilityNavEvent.Back -> navigator.pop()
                    }
                }
            )
        }

        is SettingsEditProfile -> NavEntry(key) {
            EditProfileRoute(
                onNavigate = { event ->
                    when (event) {
                        SettingsEditProfileNavEvent.Back -> navigator.pop()
                        SettingsEditProfileNavEvent.Save -> navigator.pop()
                    }
                }
            )
        }

        is SettingsNotifications -> NavEntry(key) {
            SettingsNotificationsRoute(
                onNavigate = { event ->
                    when (event) {
                        SettingsNotificationsNavEvent.Back -> navigator.pop()
                    }
                }
            )
        }

        is SettingsPrivacyAndSecurity -> NavEntry(key) {
            PrivacyAndSecurityRoute(
                onNavigate = { event ->
                    when (event) {
                        SettingsPrivacyAndSecurityNavEvent.Back -> navigator.pop()
                        SettingsPrivacyAndSecurityNavEvent.ManageTrustedDevices -> {}
                    }
                }
            )
        }

        is SettingsStorageAndData -> NavEntry(key) {
            StorageAndDataRoute(
                onNavigate = { event ->
                    when (event) {
                        SettingsStorageAndDataNavEvent.Back -> navigator.pop()
                        SettingsStorageAndDataNavEvent.DownloadPath -> {}
                    }
                }
            )
        }

        is SettingsAbout -> NavEntry(key) {
            SettingsAboutRoute(
                versionName = "0.0.1",
                onNavigate = { event ->
                    when (event) {
                        SettingsAboutNavEvent.Back -> navigator.pop()
                    }
                }
            )
        }

        else -> null
    }
}