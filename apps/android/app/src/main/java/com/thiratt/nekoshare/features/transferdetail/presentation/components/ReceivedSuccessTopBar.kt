package com.thiratt.nekoshare.features.transferdetail.presentation.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.automirrored.rounded.ViewList
import androidx.compose.material.icons.rounded.CheckCircleOutline
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.DeleteForever
import androidx.compose.material.icons.rounded.GridOn
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.components.NekoDropdownMenu
import com.thiratt.nekoshare.core.designsystem.components.NekoDropdownMenuItem
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.transferdetail.model.LayoutMode

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ReceivedSuccessTopBar(
    fileName: String,
    senderName: String,
    isImage: Boolean,
    layoutMode: LayoutMode,
    onToggleLayout: () -> Unit,
    onBack: () -> Unit,
    onDelete: () -> Unit,
    onShowDetails: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isMenuExpanded by remember { mutableStateOf(false) }
    val titleText = if (layoutMode == LayoutMode.Grid) "ไฟล์ทั้งหมด" else fileName
    val toggleLayoutIcon = if (layoutMode == LayoutMode.Grid) {
        Icons.AutoMirrored.Rounded.ViewList
    } else {
        Icons.Rounded.GridOn
    }

    TopAppBar(
        modifier = modifier,
        title = {
            Column {
                Text(
                    text = titleText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.titleMedium
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
        actions = {
            IconButton(onClick = onToggleLayout) {
                Icon(
                    imageVector = toggleLayoutIcon,
                    contentDescription = "สลับรูปแบบการแสดงผล"
                )
            }

            Box {
                IconButton(onClick = { isMenuExpanded = true }) {
                    Icon(
                        imageVector = Icons.Rounded.MoreVert,
                        contentDescription = "ตัวเลือกเพิ่มเติม"
                    )
                }

                ReceivedSuccessActionMenu(
                    expanded = isMenuExpanded,
                    layoutMode = layoutMode,
                    isImage = isImage,
                    onDismiss = { isMenuExpanded = false },
                    onDelete = onDelete,
                    onShowDetails = onShowDetails
                )
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
    )
}

@Composable
private fun ReceivedSuccessActionMenu(
    expanded: Boolean,
    layoutMode: LayoutMode,
    isImage: Boolean,
    onDismiss: () -> Unit,
    onDelete: () -> Unit,
    onShowDetails: () -> Unit
) {
    NekoDropdownMenu(
        expanded = expanded,
        onDismissRequest = onDismiss
    ) {
        when (layoutMode) {
            LayoutMode.Preview -> {
                if (isImage) {
                    NekoDropdownMenuItem(
                        text = "คัดลอกรูปภาพ",
                        icon = Icons.Rounded.ContentCopy,
                        onClick = { onDismiss() }
                    )
                }

                NekoDropdownMenuItem(
                    text = "เปิดด้วย",
                    icon = Icons.AutoMirrored.Rounded.OpenInNew,
                    onClick = { onDismiss() }
                )

                NekoDropdownMenuItem(
                    text = "แชร์",
                    icon = Icons.Rounded.Share,
                    onClick = { onDismiss() }
                )

                NekoDropdownMenuItem(
                    text = "รายละเอียด",
                    icon = Icons.Rounded.Info,
                    onClick = {
                        onDismiss()
                        onShowDetails()
                    }
                )

                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 4.dp),
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                )

                NekoDropdownMenuItem(
                    text = "ลบไฟล์",
                    icon = Icons.Rounded.Delete,
                    onClick = {
                        onDismiss()
                        onDelete()
                    },
                    isDestructive = true
                )
            }

            LayoutMode.Grid -> {
                NekoDropdownMenuItem(
                    text = "เลือก",
                    icon = Icons.Rounded.CheckCircleOutline,
                    onClick = { onDismiss() }
                )

                NekoDropdownMenuItem(
                    text = "แชร์ทั้งหมด",
                    icon = Icons.Rounded.Share,
                    onClick = { onDismiss() }
                )

                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 4.dp),
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                )

                NekoDropdownMenuItem(
                    text = "ลบการโอน",
                    icon = Icons.Rounded.DeleteForever,
                    onClick = {
                        onDismiss()
                        onDelete()
                    },
                    isDestructive = true
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ReceivedSuccessTopBarPreview() {
    NekoShareTheme {
        ReceivedSuccessTopBar(
            fileName = "IMG_20260225_001.jpg",
            senderName = "Alice",
            isImage = true,
            layoutMode = LayoutMode.Preview,
            onToggleLayout = {},
            onBack = {},
            onDelete = {},
            onShowDetails = {}
        )
    }
}
