package com.thiratt.nekoshare.features.settings.presentation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.FontDownload
import androidx.compose.material.icons.rounded.FormatSize
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.Smartphone
import androidx.compose.material.icons.rounded.TouchApp
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.lifecycle.viewmodel.compose.viewModel
import com.thiratt.nekoshare.AppTheme
import com.thiratt.nekoshare.ThemeViewModel
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsActionItem
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsDialog
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsSwitchItem
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsTopAppBar

sealed interface SettingsAccessibilityNavEvent {
    data object Back : SettingsAccessibilityNavEvent
}

private enum class DialogType { Theme, Language, FontStyle, FontSize }

@Composable
fun AccessibilityRoute(
    viewModel: ThemeViewModel = viewModel(),
    onNavigate: (SettingsAccessibilityNavEvent) -> Unit
) {
    val currentTheme by viewModel.theme.collectAsState()

    AccessibilityScreen(
        currentTheme = currentTheme,
        onThemeChanged = viewModel::setTheme,
        onBackClick = { onNavigate(SettingsAccessibilityNavEvent.Back) }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccessibilityScreen(
    currentTheme: AppTheme,
    onThemeChanged: (AppTheme) -> Unit,
    onBackClick: () -> Unit
) {
    val scrollState = rememberScrollState()

    var keepScreenOn by remember { mutableStateOf(false) }
    var hapticFeedback by remember { mutableStateOf(true) }
    var activeDialog by remember { mutableStateOf<DialogType?>(null) }

    var currentLanguage by remember { mutableStateOf("English") }
    var currentFontStyle by remember { mutableStateOf("Default") }
    var currentFontSize by remember { mutableStateOf("Medium") }

    Scaffold(
        topBar = { SettingsTopAppBar("Accessibility", onBackClick) },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(scrollState)
        ) {
            SettingsGroupTitle("Display & Appearance")

            SettingsActionItem(
                icon = Icons.Rounded.Palette,
                title = "Theme",
                value = getThemeName(currentTheme),
                onClick = { activeDialog = DialogType.Theme }
            )

            SettingsActionItem(
                icon = Icons.Rounded.Language,
                title = "Language",
                value = currentLanguage,
                onClick = { activeDialog = DialogType.Language }
            )

            SettingsActionItem(
                icon = Icons.Rounded.FontDownload,
                title = "Font Style",
                value = currentFontStyle,
                onClick = { activeDialog = DialogType.FontStyle }
            )

            SettingsActionItem(
                icon = Icons.Rounded.FormatSize,
                title = "Font Size",
                value = currentFontSize,
                onClick = { activeDialog = DialogType.FontSize }
            )

            SettingsGroupTitle("Interaction")

            SettingsSwitchItem(
                icon = Icons.Rounded.Smartphone,
                title = "Keep Screen On",
                subtitle = "Prevent screen from sleeping during file transfer",
                checked = keepScreenOn,
                onCheckedChange = { keepScreenOn = it }
            )

            SettingsSwitchItem(
                icon = Icons.Rounded.TouchApp,
                title = "Haptic Feedback",
                subtitle = "Vibrate on touch interactions",
                checked = hapticFeedback,
                onCheckedChange = { hapticFeedback = it }
            )
        }

        when (activeDialog) {
            DialogType.Theme -> SettingsDialog(
                title = "Theme",
                options = AppTheme.entries,
                currentOption = currentTheme,
                onDismiss = { activeDialog = null },
                onOptionSelected = {
                    onThemeChanged(it)
                    activeDialog = null
                },
                labelProvider = { theme ->
                    when (theme) {
                        AppTheme.System -> "System Default"
                        AppTheme.Light -> "Light"
                        AppTheme.Dark -> "Dark"
                    }
                },
                iconProvider = { theme ->
                    when (theme) {
                        AppTheme.System -> Icons.Rounded.Smartphone
                        AppTheme.Light -> Icons.Rounded.LightMode
                        AppTheme.Dark -> Icons.Rounded.DarkMode
                    }
                }
            )

            DialogType.Language -> SettingsDialog(
                title = "Language",
                options = listOf("English", "ไทย", "日本語"),
                currentOption = currentLanguage,
                onDismiss = { activeDialog = null },
                onOptionSelected = {
                    currentLanguage = it
                    activeDialog = null
                },
                labelProvider = { it }
            )

            DialogType.FontStyle -> SettingsDialog(
                title = "Font Style",
                options = listOf("Default", "System", "Rounded"),
                currentOption = currentFontStyle,
                onDismiss = { activeDialog = null },
                onOptionSelected = {
                    currentFontStyle = it
                    activeDialog = null
                },
                labelProvider = { it }
            )

            DialogType.FontSize -> SettingsDialog(
                title = "Font Size",
                options = listOf("Small", "Medium", "Large", "Extra Large"),
                currentOption = currentFontSize,
                onDismiss = { activeDialog = null },
                onOptionSelected = {
                    currentFontSize = it
                    activeDialog = null
                },
                labelProvider = { it }
            )

            null -> Unit
        }
    }
}

fun getThemeName(theme: AppTheme): String {
    return when (theme) {
        AppTheme.Light -> "Light"
        AppTheme.Dark -> "Dark"
        AppTheme.System -> "System Default"
    }
}

@Preview(showBackground = true)
@Composable
fun AccessibilityScreenPreview() {
    NekoShareTheme {
        AccessibilityScreen(
            currentTheme = AppTheme.Light,
            onThemeChanged = {},
            onBackClick = {}
        )
    }
}