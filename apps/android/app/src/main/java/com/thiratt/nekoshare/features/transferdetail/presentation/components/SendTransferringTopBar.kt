package com.thiratt.nekoshare.features.transferdetail.presentation.components

import androidx.compose.foundation.layout.Column
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun SendTransferringTopBar(
    fileCount: Int,
    targetName: String,
    isPaused: Boolean,
    onBack: () -> Unit
) {
    val titleText = if (isPaused) {
        "หยุดชั่วคราว $fileCount ไฟล์"
    } else {
        "กำลังส่ง $fileCount ไฟล์..."
    }

    TopAppBar(
        title = {
            Column {
                Text(
                    text = titleText,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "ไปยังอุปกรณ์ของ $targetName",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        navigationIcon = {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                    contentDescription = "ย้อนกลับ"
                )
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
    )
}

@Preview(showBackground = true)
@Composable
private fun SendTransferringTopBarPreview() {
    NekoShareTheme {
        SendTransferringTopBar(
            fileCount = 4,
            targetName = "Living Room TV",
            isPaused = false,
            onBack = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SendTransferringTopBarPausedPreview() {
    NekoShareTheme {
        SendTransferringTopBar(
            fileCount = 4,
            targetName = "Living Room TV",
            isPaused = true,
            onBack = {}
        )
    }
}
