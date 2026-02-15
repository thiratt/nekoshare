package com.thiratt.nekoshare.features.settings.presentation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Analytics
import androidx.compose.material.icons.rounded.Contacts
import androidx.compose.material.icons.rounded.Devices
import androidx.compose.material.icons.rounded.Public
import androidx.compose.material.icons.rounded.VerifiedUser
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
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
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsActionItem
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsDialog
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsSwitchItem
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsTopAppBar

sealed interface SettingsPrivacyAndSecurityNavEvent {
    data object Back : SettingsPrivacyAndSecurityNavEvent
    data object ManageTrustedDevices : SettingsPrivacyAndSecurityNavEvent
}

enum class DeviceVisibility(val label: String, val description: String) {
    Everyone("Everyone", "Visible to all nearby devices"),
    Contacts("Contacts Only", "Visible only to saved contacts"),
    Hidden("Hidden", "No one can see you")
}

@Composable
fun PrivacyAndSecurityRoute(
    onNavigate: (SettingsPrivacyAndSecurityNavEvent) -> Unit
) {
    PrivacyAndSecurityScreen(
        onBackClick = { onNavigate(SettingsPrivacyAndSecurityNavEvent.Back) },
        onTrustDeviceClick = { onNavigate(SettingsPrivacyAndSecurityNavEvent.ManageTrustedDevices) },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrivacyAndSecurityScreen(
    onBackClick: () -> Unit,
    onTrustDeviceClick: () -> Unit
) {
    var visibility by remember { mutableStateOf(DeviceVisibility.Everyone) }
    var autoAcceptTrusted by remember { mutableStateOf(false) }
    var showVisibilityDialog by remember { mutableStateOf(false) }
    var shareUsageData by remember { mutableStateOf(true) }

    Scaffold(
        topBar = { SettingsTopAppBar("Privacy & Security", onBackClick) },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
        ) {
            SettingsGroupTitle("Discovery")

            SettingsActionItem(
                icon = Icons.Rounded.Visibility,
                title = "Device Visibility",
                subtitle = visibility.description,
                value = visibility.label,
                onClick = { showVisibilityDialog = true }
            )

            SettingsGroupTitle("Connection")

            SettingsSwitchItem(
                icon = Icons.Rounded.VerifiedUser,
                title = "Auto-accept Trusted",
                subtitle = "Receive files from trusted devices automatically",
                checked = autoAcceptTrusted,
                onCheckedChange = { autoAcceptTrusted = it }
            )

            SettingsActionItem(
                icon = Icons.Rounded.Devices,
                title = "Trusted Devices",
                subtitle = "Manage allowed devices",
                onClick = onTrustDeviceClick
            )

            SettingsGroupTitle("Data")

            SettingsSwitchItem(
                icon = Icons.Rounded.Analytics,
                title = "Share Usage Data",
                subtitle = "Help improve NekoShare by sending anonymous data",
                checked = shareUsageData,
                onCheckedChange = { shareUsageData = it }
            )
        }
    }

    if (showVisibilityDialog) {
        SettingsDialog(
            title = "Who can see you?",
            options = DeviceVisibility.entries,
            currentOption = visibility,
            onDismiss = { showVisibilityDialog = false },
            onOptionSelected = {
                visibility = it
                showVisibilityDialog = false
            },
            labelProvider = { it.label },
            descriptionProvider = { it.description },
            iconProvider = { option ->
                when (option) {
                    DeviceVisibility.Everyone -> Icons.Rounded.Public
                    DeviceVisibility.Contacts -> Icons.Rounded.Contacts
                    DeviceVisibility.Hidden -> Icons.Rounded.VisibilityOff
                }
            }
        )
    }
}

@Preview(showBackground = true)
@Composable
fun PrivacyAndSecurityScreenPreview() {
    NekoShareTheme {
        PrivacyAndSecurityScreen(
            onBackClick = {},
            onTrustDeviceClick = {}
        )
    }
}