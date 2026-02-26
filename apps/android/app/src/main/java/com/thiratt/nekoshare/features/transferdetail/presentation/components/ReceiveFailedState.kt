package com.thiratt.nekoshare.features.transferdetail.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.transferdetail.model.TransferDirection
import com.thiratt.nekoshare.features.transferdetail.model.TransferItem
import com.thiratt.nekoshare.features.transferdetail.model.TransferStatus
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReceiveFailedState(
    item: TransferItem,
    onBack: () -> Unit
) {
    val fileSizes = remember(item.files) {
        item.files.associateWith(::mockFileSizeBytes)
    }
    val senderName = item.senderName.takeIf { it.isNotBlank() } ?: "ผู้ส่ง"

    Scaffold(
        topBar = {
            ReceivedFailedTopBar(
                fileCount = item.files.size,
                senderName = senderName,
                onBack = onBack
            )
        },
        contentWindowInsets = WindowInsets(0)
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .padding(top = padding.calculateTopPadding())
                .fillMaxSize(),
            contentPadding = PaddingValues(
                start = 16.dp,
                end = 16.dp,
                top = 20.dp,
                bottom = 20.dp
            ),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(item.files) { file ->
                ReceiveFailedFileItem(
                    file = file,
                    fileSizeBytes = fileSizes[file] ?: 0L
                )
            }
        }
    }
}

@Composable
private fun ReceiveFailedFileItem(
    file: File,
    fileSizeBytes: Long
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                color = MaterialTheme.colorScheme.secondaryContainer,
                shape = RoundedCornerShape(16.dp)
            )
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.errorContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = getFileIcon(file),
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onErrorContainer,
                modifier = Modifier.size(20.dp)
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = file.name,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "รับไม่สำเร็จ • ${formatTransferSize(fileSizeBytes)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ReceiveFailedStatePreview() {
    NekoShareTheme {
        val item = TransferItem(
            id = "receive-failed",
            files = listOf(
                File("NekoShare_Setup_v1.0.exe"),
                File("Presentation_Final.pptx"),
                File("raw_camera_dump.zip")
            ),
            senderName = "Kenneth",
            status = TransferStatus.Failed,
            direction = TransferDirection.Receiving
        )

        ReceiveFailedState(
            item = item,
            onBack = {}
        )
    }
}


