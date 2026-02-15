package com.thiratt.nekoshare.features.settings.presentation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material.icons.rounded.Upload
import androidx.compose.material.icons.rounded.Vibration
import androidx.compose.material.icons.rounded.VolumeUp
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsSwitchItem
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsTopAppBar

sealed interface SettingsNotificationsNavEvent {
    data object Back : SettingsNotificationsNavEvent
}

@Composable
fun SettingsNotificationsRoute(
    onNavigate: (SettingsNotificationsNavEvent) -> Unit
) {
    NotificationsScreen(
        onBackClick = { onNavigate(SettingsNotificationsNavEvent.Back) }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    onBackClick: () -> Unit
) {
    var notifyReceive by remember { mutableStateOf(true) }
    var notifySend by remember { mutableStateOf(true) }
    var notifyRequests by remember { mutableStateOf(true) }
    var soundEnabled by remember { mutableStateOf(true) }
    var vibrationEnabled by remember { mutableStateOf(true) }

    Scaffold(
        topBar = { SettingsTopAppBar("Notifications", onBackClick) },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
        ) {
            SettingsGroupTitle("Transfer")

            SettingsSwitchItem(
                icon = Icons.Rounded.Download,
                title = "File Received",
                subtitle = "Get notified when a file is received",
                checked = notifyReceive,
                onCheckedChange = { notifyReceive = it }
            )

            SettingsSwitchItem(
                icon = Icons.Rounded.Upload,
                title = "File Sent",
                subtitle = "Get notified when transfer completes",
                checked = notifySend,
                onCheckedChange = { notifySend = it }
            )

            SettingsGroupTitle("Social")

            SettingsSwitchItem(
                icon = Icons.Rounded.PersonAdd,
                title = "Friend Requests",
                subtitle = "New friend requests and acceptances",
                checked = notifyRequests,
                onCheckedChange = { notifyRequests = it }
            )

            SettingsGroupTitle("Behavior")

            SettingsSwitchItem(
                icon = Icons.Rounded.VolumeUp,
                title = "Sound",
                subtitle = "Play sound for notifications",
                checked = soundEnabled,
                onCheckedChange = { soundEnabled = it }
            )

            SettingsSwitchItem(
                icon = Icons.Rounded.Vibration,
                title = "Vibration",
                subtitle = "Vibrate for notifications",
                checked = vibrationEnabled,
                onCheckedChange = { vibrationEnabled = it }
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun NotificationsScreenPreview() {
    NekoShareTheme {
        NotificationsScreen(onBackClick = {})
    }
}