package com.thiratt.nekoshare.features.settings.presentation.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme

data class SettingsTopBarAction(
    val title: String,
    val onClick: () -> Unit
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsTopAppBar(
    title: String,
    onBackClick: () -> Unit,
    action: SettingsTopBarAction? = null
) {
    TopAppBar(
        title = { Text(title) },
        navigationIcon = {
            IconButton(onBackClick) {
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, "ย้อนกลับ")
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.background
        ),
        actions = {
            action?.let {
                TextButton(onClick = it.onClick) {
                    Text(
                        text = it.title,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    )
}

@Preview(showBackground = true)
@Composable
fun SettingsTopAppBarPreview() {
    NekoShareTheme {
        SettingsTopAppBar("หน้าแรก", {})
    }
}