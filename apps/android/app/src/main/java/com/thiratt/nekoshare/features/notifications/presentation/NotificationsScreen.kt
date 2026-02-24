package com.thiratt.nekoshare.features.notifications.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.DoneAll
import androidx.compose.material.icons.rounded.DownloadDone
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.NotificationsNone
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme

enum class NotificationType {
    TransferSuccess, TransferFail, Social, System
}

data class NotificationModel(
    val id: String,
    val title: String,
    val description: String,
    val time: String,
    val type: NotificationType,
    val isUnread: Boolean = false
)

sealed interface NotificationsNavEvent {
    data object Back : NotificationsNavEvent
}

@Composable
fun NotificationsRoute(
    onNavigate: (NotificationsNavEvent) -> Unit
) {
    NotificationsScreen(
        onBackClick = { onNavigate(NotificationsNavEvent.Back) }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    onBackClick: () -> Unit
) {
    val notifications = remember {
        listOf(
            NotificationModel("1", "ได้รับไฟล์", "ได้รับ 'Project_Final.pdf' จาก Kenneth", "2 นาทีที่แล้ว", NotificationType.TransferSuccess, true),
            NotificationModel("2", "คำขอเป็นเพื่อน", "Sarah ต้องการเป็นเพื่อนกับคุณ", "1 ชั่วโมงที่แล้ว", NotificationType.Social, true),
            NotificationModel("3", "โอนส่งล้มเหลว", "ส่ง 'Movie.mp4' ไปยัง iPad Air ไม่สำเร็จ", "3 ชั่วโมงที่แล้ว", NotificationType.TransferFail, false),
            NotificationModel("4", "อัปเดตระบบ", "NekoShare v2.0 พร้อมให้ใช้งานแล้ว!", "เมื่อวาน", NotificationType.System, false),
            NotificationModel("5", "ส่งไฟล์แล้ว", "ส่งรูป 5 รูปไปยัง Mike สำเร็จ", "เมื่อวาน", NotificationType.TransferSuccess, false),
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("การแจ้งเตือน") },
                navigationIcon = {
                    IconButton(onBackClick) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, "ย้อนกลับ")
                    }
                },
                actions = {
                    IconButton(onClick = { /* ViewModel.markAllRead() */ }) {
                        Icon(Icons.Rounded.DoneAll, "ทำเครื่องหมายว่าอ่านทั้งหมด")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        if (notifications.isEmpty()) {
            EmptyNotificationState(modifier = Modifier.padding(innerPadding))
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                items(notifications) { notification ->
                    NotificationItem(
                        item = notification,
                        onClick = { /* Handle click */ }
                    )
                }
            }
        }
    }
}

@Composable
fun NotificationItem(
    item: NotificationModel,
    onClick: () -> Unit
) {
    val backgroundColor = if (item.isUnread)
        MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha = 0.5f)
    else
        Color.Transparent

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(backgroundColor)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.Top
    ) {
        NotificationIcon(type = item.type)

        Spacer(modifier = Modifier.width(16.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = item.title,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = if (item.isUnread) FontWeight.Bold else FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Text(
                    text = item.time,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = item.description,
                style = MaterialTheme.typography.bodyMedium,
                color = if (item.isUnread) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }

        if (item.isUnread) {
            Spacer(modifier = Modifier.width(12.dp))
            Box(
                modifier = Modifier
                    .padding(top = 6.dp)
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary)
            )
        }
    }
}

@Composable
fun NotificationIcon(type: NotificationType) {
    val (icon, color) = when (type) {
        NotificationType.TransferSuccess ->
            Icons.Rounded.DownloadDone to Color(0xFF2E7D32)

        NotificationType.TransferFail ->
            Icons.Rounded.ErrorOutline to MaterialTheme.colorScheme.error

        NotificationType.Social ->
            Icons.Rounded.PersonAdd to MaterialTheme.colorScheme.primary

        NotificationType.System ->
            Icons.Rounded.Info to MaterialTheme.colorScheme.onSurfaceVariant
    }

    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surfaceVariant),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(24.dp)
        )
    }
}

@Composable
fun EmptyNotificationState(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.surfaceContainerHighest.copy(alpha = 0.5f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Rounded.NotificationsNone,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                modifier = Modifier.size(64.dp)
            )
        }
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = "ยังไม่มีการแจ้งเตือน",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = "กิจกรรมล่าสุดของคุณจะแสดงที่นี่",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Preview(showBackground = true)
@Composable
fun NotificationsScreenPreview() {
    NekoShareTheme {
        NotificationsScreen(
            onBackClick = {}
        )
    }
}