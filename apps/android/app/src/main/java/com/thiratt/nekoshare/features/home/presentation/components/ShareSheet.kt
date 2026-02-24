package com.thiratt.nekoshare.features.home.presentation.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.InsertDriveFile
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.Image
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.components.NekoModalBottomSheet
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.home.model.DeviceItem
import com.thiratt.nekoshare.features.home.model.DeviceStatus
import com.thiratt.nekoshare.features.home.model.DeviceType
import com.thiratt.nekoshare.features.home.model.FileType
import com.thiratt.nekoshare.features.home.model.SelectedFile
import com.thiratt.nekoshare.features.home.presentation.tabs.getDeviceIconAndColor
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShareActionSheet(
    onDismissRequest: () -> Unit,
    onDeviceSelected: (DeviceItem) -> Unit,
    onFileSelect: () -> Unit,
    onPhotoSelect: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val selectedFiles = remember { mutableStateListOf<SelectedFile>() }
    val scope = rememberCoroutineScope()

    val nearbyDevices = listOf(
        DeviceItem("2", "Kenneth's PC", "NekoShare Desktop", "2.1.0", DeviceType.Windows, DeviceStatus.Online, "192.168.1.5", "ใกล้คุณ", "ตอนนี้"),
        DeviceItem("3", "Pixel 8", "NekoShare Android", "1.0.0", DeviceType.Android, DeviceStatus.Offline, "192.168.1.9", "ออฟไลน์", "10 นาทีที่แล้ว")
    )

    fun simulateFileSelection() {
        selectedFiles.add(SelectedFile("Holiday_Trip_${selectedFiles.size + 1}.jpg", "2.4 MB", FileType.Image))
        selectedFiles.add(SelectedFile("Project_Report.pdf", "1.1 MB", FileType.Document))
    }

    fun dismiss() {
        scope.launch {
            sheetState.hide()
            onDismissRequest()
        }
    }

    NekoModalBottomSheet(
        sheetState = sheetState,
        onDismissRequest = { dismiss() },
        dragHandle = false
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
        ) {
            Text(
                text = "แชร์เนื้อหา",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = if (selectedFiles.isEmpty()) "เลือกสิ่งที่ต้องการส่ง" else "เลือกแล้ว ${selectedFiles.size} รายการ",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        AnimatedContent(
            targetState = selectedFiles.isNotEmpty(),
            label = "FileSelectionState",
            transitionSpec = {
                (fadeIn(tween(300)) + slideInVertically { it / 4 }) togetherWith
                        (fadeOut(tween(300)) + slideOutVertically { -it / 4 })
            }
        ) { hasFiles ->
            if (hasFiles) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(selectedFiles) { file ->
                        SelectedFileCard(
                            file = file,
                            onRemove = { selectedFiles.remove(file) }
                        )
                    }
                    item {
                        AddMoreDashedButton(onClick = { simulateFileSelection() })
                    }
                }
            } else {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    BigActionButton(
                        icon = Icons.Rounded.Image,
                        label = "รูปภาพ",
                        subLabel = "แกลเลอรี",
                        color = Color(0xFF43A047),
                        containerColor = Color(0xFFE8F5E9),
                        onClick = { simulateFileSelection() },
                        modifier = Modifier.weight(1f)
                    )
                    BigActionButton(
                        icon = Icons.AutoMirrored.Rounded.InsertDriveFile,
                        label = "ไฟล์",
                        subLabel = "เรียกดู",
                        color = Color(0xFF1E88E5),
                        containerColor = Color(0xFFE3F2FD),
                        onClick = { simulateFileSelection() },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        Text(
            text = "อุปกรณ์ใกล้เคียง",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 24.dp)
        )

        Spacer(modifier = Modifier.height(16.dp))

        LazyRow(
            contentPadding = PaddingValues(horizontal = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            items(nearbyDevices) { device ->
                DeviceItem(
                    device = device,
                    onClick = {
                        scope.launch {
                            sheetState.hide()
                            onDeviceSelected(device)
                            onDismissRequest()
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun SelectedFileCard(file: SelectedFile, onRemove: () -> Unit) {
    val (icon, color, bg) = when (file.type) {
        FileType.Image -> Triple(Icons.Rounded.Image, Color(0xFF2E7D32), Color(0xFFE8F5E9))
        FileType.Document -> Triple(Icons.Rounded.Description, Color(0xFF1565C0), Color(0xFFE3F2FD))
        else -> Triple(Icons.AutoMirrored.Rounded.InsertDriveFile, Color(0xFF424242), Color(0xFFF5F5F5))
    }

    Box(modifier = Modifier.width(110.dp)) {
        Surface(
            color = MaterialTheme.colorScheme.surfaceContainerLow,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth().height(120.dp)
        ) {
            Column(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(bg, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, null, tint = color, modifier = Modifier.size(20.dp))
                }

                Spacer(modifier = Modifier.height(8.dp))

                Column {
                    Text(
                        text = file.name,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        lineHeight = MaterialTheme.typography.labelMedium.lineHeight
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = file.size,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .offset(x = 6.dp, y = (-6).dp)
                .size(24.dp)
                .background(MaterialTheme.colorScheme.errorContainer, CircleShape)
                .border(2.dp, MaterialTheme.colorScheme.surface, CircleShape)
                .clickable { onRemove() }
                .clip(CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Rounded.Close,
                null,
                tint = MaterialTheme.colorScheme.onErrorContainer,
                modifier = Modifier.size(14.dp)
            )
        }
    }
}

@Composable
fun AddMoreDashedButton(onClick: () -> Unit) {
    val stroke = Stroke(
        width = 4f,
        pathEffect = PathEffect.dashPathEffect(floatArrayOf(20f, 20f), 0f)
    )
    val color = MaterialTheme.colorScheme.primary.copy(alpha = 0.6f)

    Box(
        modifier = Modifier
            .width(110.dp)
            .height(120.dp)
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .drawBehind {
                drawRoundRect(
                    color = color,
                    style = stroke,
                    cornerRadius = CornerRadius(16.dp.toPx())
                )
            },
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Rounded.Add, null, tint = color, modifier = Modifier.size(32.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text("เพิ่ม", style = MaterialTheme.typography.labelMedium, color = color, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun BigActionButton(
    icon: ImageVector,
    label: String,
    subLabel: String,
    color: Color,
    containerColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        color = containerColor,
        shape = RoundedCornerShape(20.dp),
        modifier = modifier.height(100.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.Start
        ) {
            Icon(icon, null, tint = color, modifier = Modifier.size(32.dp))
            Spacer(modifier = Modifier.weight(1f))
            Text(label, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = Color.Black.copy(alpha = 0.8f))
            Text(subLabel, style = MaterialTheme.typography.bodySmall, color = Color.Black.copy(alpha = 0.5f))
        }
    }
}

@Composable
fun DeviceItem(
    device: DeviceItem,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val (icon, bgColor) = getDeviceIconAndColor(device.type)

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .width(84.dp)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            )
    ) {
        Box(
            modifier = Modifier.size(72.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(CircleShape)
                    .background(bgColor.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = bgColor,
                    modifier = Modifier.size(36.dp)
                )
            }

            if (device.status == DeviceStatus.Online) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(4.dp)
                        .size(16.dp)
                        .background(Color(0xFF4CAF50), CircleShape)
                        .border(2.dp, MaterialTheme.colorScheme.surface, CircleShape)
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = device.name,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Text(
            text = when (device.type) {
                DeviceType.Windows -> "วินโดวส์"
                DeviceType.Android -> "แอนดรอยด์"
                DeviceType.Website -> "เว็บ"
            },
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1
        )
    }
}

@Preview(showBackground = true)
@Composable
fun ShareActionSheetPreview() {
    NekoShareTheme {
        ShareActionSheet(
            onDismissRequest = {},
            onDeviceSelected = {},
            onFileSelect = {},
            onPhotoSelect = {}
        )
    }
}
