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
internal fun ReceivedFailedTopBar(
    fileCount: Int,
    senderName: String,
    onBack: () -> Unit
) {
    TopAppBar(
        title = {
            Column {
                Text(
                    text = "รับไม่สำเร็จ $fileCount ไฟล์",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "จาก $senderName",
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
private fun ReceivedFailedTopBarPreview() {
    NekoShareTheme {
        ReceivedFailedTopBar(
            fileCount = 2,
            senderName = "Kenneth's MacBook",
            onBack = {}
        )
    }
}
