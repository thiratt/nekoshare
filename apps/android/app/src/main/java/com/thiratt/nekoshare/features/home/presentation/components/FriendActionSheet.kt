package com.thiratt.nekoshare.features.home.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PersonRemove
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SheetState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.components.NekoModalBottomSheet
import com.thiratt.nekoshare.features.home.model.Friend

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendActionSheet(
    friend: Friend,
    sheetState: SheetState,
    onDismissRequest: () -> Unit,
    onSendFile: () -> Unit = {},
    onViewProfile: () -> Unit = {},
    onEditName: () -> Unit = {},
    onBlock: () -> Unit = {},
    onRemove: () -> Unit = {}
) {
    NekoModalBottomSheet(
        sheetState = sheetState,
        onDismissRequest = onDismissRequest
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = friend.name.take(1).uppercase(),
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = friend.name,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = friend.username,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        HorizontalDivider()

        ActionItem(
            icon = Icons.AutoMirrored.Rounded.Send,
            label = "ส่งไฟล์",
            onClick = onSendFile
        )
        ActionItem(
            icon = Icons.Rounded.Person,
            label = "ดูโปรไฟล์",
            onClick = onViewProfile
        )
        ActionItem(
            icon = Icons.Rounded.Edit,
            label = "แก้ไขชื่อ",
            onClick = onEditName
        )

        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

        ActionItem(
            icon = Icons.Rounded.Block,
            label = "บล็อกผู้ใช้",
            onClick = onBlock
        )
        ActionItem(
            icon = Icons.Rounded.PersonRemove,
            label = "ลบเพื่อน",
            isDestructive = true,
            onClick = onRemove
        )
    }
}