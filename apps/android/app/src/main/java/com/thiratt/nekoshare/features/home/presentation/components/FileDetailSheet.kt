package com.thiratt.nekoshare.features.home.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.InsertDriveFile
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.rounded.Archive
import androidx.compose.material.icons.rounded.Audiotrack
import androidx.compose.material.icons.rounded.DeleteForever
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.FolderZip
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Image
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.RemoveRedEye
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.VideoFile
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SheetState
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.components.NekoModalBottomSheet
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.home.model.FileType
import com.thiratt.nekoshare.features.home.model.ReceivedFileDetail
import com.thiratt.nekoshare.features.home.model.TargetType
import com.thiratt.nekoshare.features.home.model.TransferHistoryItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FileDetailSheet(
    item: TransferHistoryItem,
    sheetState: SheetState,
    onDismissRequest: () -> Unit,
    onView: () -> Unit = {},
    onOpen: () -> Unit = {},
    onShare: () -> Unit = {},
    onDeleteHistory: () -> Unit = {},
    onDeleteHistoryAndItems: () -> Unit = {}
) {
    val fileCount = item.files.size
    val isMultiple = fileCount > 1
    val firstFile = item.files.first()

    val (headerIcon, iconTint) = if (isMultiple) {
        Icons.Rounded.FolderZip to Color(0xFFFFC107)
    } else {
        when (firstFile.type) {
            FileType.Audio -> Icons.Rounded.Audiotrack to Color(0xFF7B1FA2)
            FileType.Archive -> Icons.Rounded.Archive to Color(0xFFF57C00)
            FileType.Document -> Icons.Rounded.Description to Color(0xFF1976D2)
            FileType.Video -> Icons.Rounded.VideoFile to Color(0xFFD32F2F)
            FileType.Image -> Icons.Rounded.Image to Color(0xFF388E3C)
            else -> Icons.AutoMirrored.Rounded.InsertDriveFile to MaterialTheme.colorScheme.onSurfaceVariant
        }
    }

    val title = if (isMultiple) "Received $fileCount files" else firstFile.name
    val subtitle = if (isMultiple) {
        "From ${item.senderName}"
    } else {
        "${firstFile.size} • from ${item.senderName}"
    }

    NekoModalBottomSheet(sheetState, onDismissRequest) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = headerIcon,
                    contentDescription = null,
                    tint = if (isMultiple) iconTint else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        HorizontalDivider()

        if (isMultiple) {
            ActionItem(
                icon = Icons.Rounded.RemoveRedEye,
                label = "View all files",
                onClick = onView
            )
        } else {
            ActionItem(icon = Icons.Rounded.RemoveRedEye, label = "View", onClick = onView)
            ActionItem(
                icon = Icons.AutoMirrored.Rounded.OpenInNew,
                label = "Open with",
                onClick = onOpen
            )
        }

        ActionItem(
            icon = Icons.Rounded.Share,
            label = if (isMultiple) "Share all" else "Share",
            onClick = onShare
        )

        ActionItem(icon = Icons.Rounded.Info, label = "Details", onClick = onView)

        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

        ActionItem(
            icon = Icons.Rounded.History,
            label = "Delete history",
            onClick = onDeleteHistory
        )

        ActionItem(
            icon = Icons.Rounded.DeleteForever,
            label = "Delete history & items",
            isDestructive = true,
            onClick = onDeleteHistoryAndItems
        )
    }
}

@Composable
fun ActionItem(
    icon: ImageVector,
    label: String,
    isDestructive: Boolean = false,
    onClick: () -> Unit
) {
    ListItem(
        headlineContent = {
            Text(
                text = label,
                color = if (isDestructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
            )
        },
        leadingContent = {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isDestructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
            )
        },
        modifier = Modifier.clickable(onClick = onClick)
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Preview(showBackground = true)
@Composable
fun FileDetailSheetPreview() {
    val groupItem = TransferHistoryItem(
        id = "1",
        senderName = "Kenneth",
        targetType = TargetType.Friend,
        files = listOf(
            ReceivedFileDetail("File1.zip", FileType.Archive),
            ReceivedFileDetail("File2.jpg", FileType.Image)
        )
    )

    val sheetState = rememberModalBottomSheetState()

    NekoShareTheme {
        FileDetailSheet(
            item = groupItem,
            sheetState = sheetState,
            onDismissRequest = {},
        )
    }
}