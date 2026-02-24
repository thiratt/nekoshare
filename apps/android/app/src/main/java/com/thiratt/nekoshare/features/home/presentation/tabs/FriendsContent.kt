package com.thiratt.nekoshare.features.home.presentation.tabs

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.home.model.Friend
import com.thiratt.nekoshare.features.home.model.FriendStatus
import com.thiratt.nekoshare.features.home.presentation.components.FriendActionSheet
import com.thiratt.nekoshare.features.home.presentation.components.FriendItem
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsContent(
    onManageFriends: () -> Unit
) {
    val friends = remember {
        listOf(
            Friend("1", "Kenneth", "@kenneth", status = FriendStatus.Friend, isOnline = true),
            Friend("2", "Chanon", "@chanon", status = FriendStatus.Friend, isOnline = false),
            Friend("3", "Sarah", "@sarah", status = FriendStatus.Incoming),
            Friend("4", "Mike", "@mike", status = FriendStatus.Outgoing),
            Friend("5", "บอทสแปม", "@spam", status = FriendStatus.Blocked),
            Friend("6", "Jessica", "@jessy", status = FriendStatus.Incoming),
            Friend("7", "ไม่ทราบชื่อ", "@unknown", status = FriendStatus.Blocked)
        )
    }

    val onlyFriends = remember(friends) {
        friends.filter { it.status == FriendStatus.Friend }
    }

    var selectedFriendForSheet by remember { mutableStateOf<Friend?>(null) }
    val sheetState = rememberModalBottomSheetState()
    val scope = rememberCoroutineScope()

    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                FriendsHeader(
                    count = onlyFriends.size,
                    onMoreClick = onManageFriends
                )
            }

            items(onlyFriends) { friend ->
                FriendItem(
                    friend = friend,
                    onItemClick = {},
                    trailingContent = {
                        IconButton(onClick = { selectedFriendForSheet = friend }) {
                            Icon(
                                imageVector = Icons.Rounded.MoreVert,
                                contentDescription = "ตัวเลือก",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                )
            }

            if (onlyFriends.isEmpty()) {
                item {
                    Text(
                        text = "ไม่พบเพื่อน ลองตรวจสอบคำขอในเมนูจัดการ",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().padding(top = 32.dp)
                    )
                }
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
        }

        if (selectedFriendForSheet != null) {
            FriendActionSheet(
                friend = selectedFriendForSheet!!,
                sheetState = sheetState,
                onDismissRequest = {
                    scope.launch { sheetState.hide() }.invokeOnCompletion {
                        selectedFriendForSheet = null
                    }
                }
            )
        }
    }
}

@Composable
private fun FriendsHeader(
    count: Int,
    onMoreClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "เพื่อน ($count)",
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = "จัดการ",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .clickable { onMoreClick() }
                .padding(horizontal = 12.dp, vertical = 6.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
fun FriendsContentPreview() {
    NekoShareTheme {
        FriendsContent(
            onManageFriends = {}
        )
    }
}
