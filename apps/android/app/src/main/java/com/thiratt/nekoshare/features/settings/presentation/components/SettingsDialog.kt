package com.thiratt.nekoshare.features.settings.presentation.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.Smartphone
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme

@Composable
fun <T> SettingsDialog(
    title: String,
    options: List<T>,
    currentOption: T?,
    onOptionSelected: (T) -> Unit,
    onDismiss: () -> Unit,
    labelProvider: (T) -> String,
    descriptionProvider: ((T) -> String)? = null,
    iconProvider: ((T) -> ImageVector)? = null
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(28.dp),
            color = MaterialTheme.colorScheme.surfaceContainerHigh,
            modifier = Modifier.width(320.dp)
        ) {
            Column(modifier = Modifier.padding(vertical = 16.dp)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
                )

                options.forEach { option ->
                    SelectionDialogItem(
                        label = labelProvider(option),
                        description = descriptionProvider?.invoke(option),
                        icon = iconProvider?.invoke(option),
                        isSelected = option == currentOption,
                        onClick = { onOptionSelected(option) }
                    )
                }
            }
        }
    }
}

@Composable
fun SelectionDialogItem(
    label: String,
    description: String? = null,
    icon: ImageVector? = null,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val iconColor = if (isSelected)
        MaterialTheme.colorScheme.primary
    else
        MaterialTheme.colorScheme.onSurfaceVariant

    val textColor = if (isSelected)
        MaterialTheme.colorScheme.primary
    else
        MaterialTheme.colorScheme.onSurface

    val fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 24.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconColor,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyLarge,
                color = textColor,
                fontWeight = fontWeight
            )
            if (description != null) {
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        if (isSelected) {
            Icon(
                imageVector = Icons.Rounded.Check,
                contentDescription = "เลือกแล้ว",
                tint = textColor,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

@Preview(showBackground = true, name = "Simple Dialog (Text Only)")
@Composable
fun SettingsDialogSimplePreview() {
    NekoShareTheme {
        SettingsDialog(
            title = "ขนาดตัวอักษร",
            options = listOf("เล็ก", "ปานกลาง", "ใหญ่", "ใหญ่มาก"),
            currentOption = "ปานกลาง",
            onOptionSelected = {},
            onDismiss = {},
            labelProvider = { it }
        )
    }
}

enum class MockTheme { Light, Dark, System }

@Preview(showBackground = true, name = "Rich Dialog (Icon + Description)")
@Composable
fun SettingsDialogRichPreview() {
    NekoShareTheme {
        SettingsDialog(
            title = "โหมดสี",
            options = MockTheme.entries,
            currentOption = MockTheme.Light,
            onOptionSelected = {},
            onDismiss = {},
            labelProvider = { theme ->
                when (theme) {
                    MockTheme.Light -> "สว่าง"
                    MockTheme.Dark -> "มืด"
                    MockTheme.System -> "ตามระบบ"
                }
            },
            iconProvider = { theme ->
                when (theme) {
                    MockTheme.Light -> Icons.Rounded.LightMode
                    MockTheme.Dark -> Icons.Rounded.DarkMode
                    MockTheme.System -> Icons.Rounded.Smartphone
                }
            }
        )
    }
}