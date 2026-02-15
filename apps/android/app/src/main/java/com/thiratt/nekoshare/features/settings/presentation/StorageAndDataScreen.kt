package com.thiratt.nekoshare.features.settings.presentation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CellWifi
import androidx.compose.material.icons.rounded.CleaningServices
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.FolderOpen
import androidx.compose.material.icons.rounded.History
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsActionItem
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsSwitchItem
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsTopAppBar
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

sealed interface SettingsStorageAndDataNavEvent {
    data object Back : SettingsStorageAndDataNavEvent
    data object DownloadPath : SettingsStorageAndDataNavEvent
}

@Composable
fun StorageAndDataRoute(
    onNavigate: (SettingsStorageAndDataNavEvent) -> Unit,
) {
    StorageAndDataScreen(
        onBackClick = { onNavigate(SettingsStorageAndDataNavEvent.Back) },
        onDownloadPathClick = { onNavigate(SettingsStorageAndDataNavEvent.DownloadPath) }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StorageAndDataScreen(
    onBackClick: () -> Unit,
    onDownloadPathClick: () -> Unit
) {
    var useMobileData by remember { mutableStateOf(false) }
    var autoDeleteHistory by remember { mutableStateOf("Never") }

    var cacheSize by remember { mutableStateOf("12.5 MB") }
    var showClearCacheDialog by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()
    val snackBarHostState = remember { SnackbarHostState() }

    Scaffold(
        topBar = { SettingsTopAppBar("Storage & Data", onBackClick) },
        snackbarHost = { SnackbarHost(snackBarHostState) },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
        ) {
            SettingsGroupTitle("Storage Location")

            SettingsActionItem(
                icon = Icons.Rounded.FolderOpen,
                title = "Download Path",
                subtitle = "/storage/emulated/0/Download/NekoShare",
                onClick = onDownloadPathClick
            )

            SettingsGroupTitle("Network")

            SettingsSwitchItem(
                icon = Icons.Rounded.CellWifi,
                title = "Use Mobile Data",
                subtitle = "Allow file transfer over cellular network",
                checked = useMobileData,
                onCheckedChange = { useMobileData = it }
            )

            SettingsGroupTitle("Data Management")

            SettingsActionItem(
                icon = Icons.Rounded.History,
                title = "Auto-delete History",
                subtitle = "Remove transfer logs automatically",
                value = autoDeleteHistory,
                onClick = { /* Show Dialog to pick: Never, 30 days, 1 year */ }
            )

            SettingsActionItem(
                icon = Icons.Rounded.CleaningServices,
                title = "Clear Cache",
                subtitle = "Free up space ($cacheSize)",
                onClick = {
                    if (cacheSize != "0 B") {
                        showClearCacheDialog = true
                    }
                }
            )
        }
    }

    if (showClearCacheDialog) {
        AlertDialog(
            onDismissRequest = { showClearCacheDialog = false },
            icon = { Icon(Icons.Rounded.Delete, contentDescription = null) },
            title = { Text("Clear Cache?") },
            text = { Text("This will remove temporary files and thumbnails. Your transferred files will not be deleted.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showClearCacheDialog = false
                        scope.launch {
                            delay(500)
                            cacheSize = "0 B"
                            snackBarHostState.showSnackbar("Cache cleared successfully")
                        }
                    }
                ) {
                    Text("Clear", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearCacheDialog = false }) {
                    Text("Cancel")
                }
            },
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh
        )
    }
}

@Preview(showBackground = true)
@Composable
fun StorageAndDataScreenPreview() {
    NekoShareTheme {
        StorageAndDataScreen(
            onBackClick = {},
            onDownloadPathClick = {}
        )
    }
}