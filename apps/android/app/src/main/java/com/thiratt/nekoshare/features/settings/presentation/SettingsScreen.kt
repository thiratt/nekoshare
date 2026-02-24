package com.thiratt.nekoshare.features.settings.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.Accessibility
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Security
import androidx.compose.material.icons.rounded.Storage
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsItem
import com.thiratt.nekoshare.features.settings.presentation.components.SettingsTopAppBar

sealed interface SettingsNavEvent {
    data object Back : SettingsNavEvent
    data object Logout : SettingsNavEvent
    data object Accessibility : SettingsNavEvent
    data object EditProfile : SettingsNavEvent
    data object Notifications : SettingsNavEvent
    data object PrivacyAndSecurity : SettingsNavEvent
    data object StorageAndData : SettingsNavEvent
    data object About : SettingsNavEvent
}

@Composable
fun SettingsRoute(
    onNavigate: (SettingsNavEvent) -> Unit
) {
    SettingsScreen(
        onBackClick = { onNavigate(SettingsNavEvent.Back) },
        onLogoutClick = { onNavigate(SettingsNavEvent.Logout) },
        onAccessibilityClick = { onNavigate(SettingsNavEvent.Accessibility) },
        onEditProfileClick = { onNavigate(SettingsNavEvent.EditProfile) },
        onNotificationsClick = { onNavigate(SettingsNavEvent.Notifications) },
        onPrivacyAndSecurityClick = { onNavigate(SettingsNavEvent.PrivacyAndSecurity) },
        onStorageAndDataClick = { onNavigate(SettingsNavEvent.StorageAndData) },
        onAboutClick = { onNavigate(SettingsNavEvent.About) }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBackClick: () -> Unit,
    onLogoutClick: () -> Unit,
    onAccessibilityClick: () -> Unit,
    onEditProfileClick: () -> Unit,
    onNotificationsClick: () -> Unit,
    onPrivacyAndSecurityClick: () -> Unit,
    onStorageAndDataClick: () -> Unit,
    onAboutClick: () -> Unit
) {
    val scrollState = rememberScrollState()
    var showLogoutDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = { SettingsTopAppBar("ตั้งค่า", onBackClick) },
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0, 0, 0, 0)
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(scrollState)
        ) {
            ProfileHeaderSection(onEditProfileClick)

            SettingsGroupTitle("ทั่วไป")

            SettingsItem(
                icon = Icons.Rounded.Accessibility,
                title = "การช่วยการเข้าถึง",
                subtitle = "การแสดงผล การโต้ตอบ และภาษา",
                onClick = onAccessibilityClick
            )

            SettingsItem(
                icon = Icons.Rounded.Notifications,
                title = "การแจ้งเตือน",
                subtitle = "การโอน คำขอ เสียง และการสั่น",
                onClick = onNotificationsClick
            )

            SettingsGroupTitle("ความเป็นส่วนตัวและข้อมูล")

            SettingsItem(
                icon = Icons.Rounded.Security,
                title = "ความเป็นส่วนตัวและความปลอดภัย",
                subtitle = "การมองเห็น ความปลอดภัย และสิทธิ์",
                onClick = onPrivacyAndSecurityClick
            )

            SettingsItem(
                icon = Icons.Rounded.Storage,
                title = "พื้นที่จัดเก็บและข้อมูล",
                subtitle = "จัดการดาวน์โหลดและล้างแคช",
                onClick = onStorageAndDataClick
            )

            SettingsGroupTitle("สนับสนุน")

            SettingsItem(
                icon = Icons.Rounded.Info,
                title = "เกี่ยวกับ NekoShare",
                subtitle = "เวอร์ชัน 0.0.1 (บิลด์ 2026)",
                onClick = onAboutClick
            )

            LogoutButton(onClick = { showLogoutDialog = true })

            Spacer(modifier = Modifier.height(48.dp))
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text(text = "ออกจากระบบ") },
            text = { Text(text = "คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ NekoShare?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        onLogoutClick()
                    }
                ) {
                    Text(
                        "ออกจากระบบ",
                        color = MaterialTheme.colorScheme.error,
                        fontWeight = FontWeight.Bold
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("ยกเลิก", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
            textContentColor = MaterialTheme.colorScheme.onSurfaceVariant,
            titleContentColor = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
fun ProfileHeaderSection(
    onEditProfileClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "TR",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Thiratt",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "thiratcha7@gmail.com",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(50))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .clickable { onEditProfileClick() }
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Text(
                text = "แก้ไขโปรไฟล์",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun SettingsGroupTitle(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.primary,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
    )
}

@Composable
fun LogoutButton(onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 24.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Rounded.Logout,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(20.dp)
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        Text(
            text = "ออกจากระบบ",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.error,
            fontWeight = FontWeight.Bold
        )
    }
}

@Preview(showBackground = true)
@Composable
fun SettingsScreenInteractivePreview() {
    NekoShareTheme {
        SettingsScreen(
            onBackClick = {},
            onLogoutClick = {},
            onAccessibilityClick = {},
            onEditProfileClick = {},
            onNotificationsClick = {},
            onPrivacyAndSecurityClick = {},
            onStorageAndDataClick = {},
            onAboutClick = {}
        )
    }
}