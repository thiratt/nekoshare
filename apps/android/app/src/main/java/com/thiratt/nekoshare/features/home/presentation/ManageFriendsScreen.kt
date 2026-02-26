package com.thiratt.nekoshare.features.home.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PrimaryScrollableTabRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.components.rememberNekoBottomSheetState
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.home.model.Friend
import com.thiratt.nekoshare.features.home.model.FriendStatus
import com.thiratt.nekoshare.features.home.presentation.components.FriendActionSheet
import com.thiratt.nekoshare.features.home.presentation.components.FriendItem
import kotlinx.coroutines.launch

sealed interface ManageFriendsNavEvent {
    data object Back : ManageFriendsNavEvent
}

@Composable
fun ManageFriendsRoute(
    onNavigate: (ManageFriendsNavEvent) -> Unit
) {
    ManageFriendsScreen(
        onBackClick = { onNavigate(ManageFriendsNavEvent.Back) }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManageFriendsScreen(
    onBackClick: () -> Unit
) {
    val allFriends = remember {
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

    data class FriendTab(val title: String, val status: FriendStatus?)
    val tabs = listOf(
        FriendTab("ทั้งหมด", null),
        FriendTab("เพื่อน", FriendStatus.Friend),
        FriendTab("คำขอ", FriendStatus.Incoming),
        FriendTab("ส่งแล้ว", FriendStatus.Outgoing),
        FriendTab("ถูกบล็อก", FriendStatus.Blocked)
    )

    var selectedTabIndex by remember { mutableIntStateOf(0) }
    val currentTab = tabs[selectedTabIndex]
    val filteredFriends = remember(selectedTabIndex, allFriends) {
        if (currentTab.status == null) allFriends else allFriends.filter { it.status == currentTab.status }
    }

    var friendToConfirm by remember { mutableStateOf<Pair<Friend, String>?>(null) }
    var selectedFriendForSheet by remember { mutableStateOf<Friend?>(null) }

    val sheetState = rememberNekoBottomSheetState()
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("จัดการเพื่อน") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, "ย้อนกลับ")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        }
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            Column(modifier = Modifier.fillMaxSize()) {
                PrimaryScrollableTabRow(
                    selectedTabIndex = selectedTabIndex,
                    edgePadding = 8.dp,
                    containerColor = Color.Transparent,
                    contentColor = MaterialTheme.colorScheme.primary,
                    divider = {},
                    indicator = {}
                ) {
                    tabs.forEachIndexed { index, tab ->
                        val isSelected = selectedTabIndex == index
                        val count = if (tab.status == null) allFriends.size else allFriends.count { it.status == tab.status }

                        Box(
                            modifier = Modifier
                                .padding(end = 4.dp)
                                .padding(vertical = 8.dp)
                                .height(36.dp)
                                .clip(CircleShape)
                                .background(
                                    if (isSelected) MaterialTheme.colorScheme.secondaryContainer
                                    else Color.Transparent
                                )
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                ) { selectedTabIndex = index }
                                .padding(horizontal = 16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "${tab.title} ($count)",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected)
                                    MaterialTheme.colorScheme.onSecondaryContainer
                                else
                                    MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                if (filteredFriends.isEmpty()) {
                    EmptyListPlaceholder(currentTab.title)
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(filteredFriends) { friend ->
                            FriendItem(
                                friend = friend,
                                onItemClick = {
                                    if (friend.status == FriendStatus.Friend) selectedFriendForSheet = friend
                                },
                                trailingContent = {
                                    when (friend.status) {
                                        FriendStatus.Incoming -> {
                                            Row {
                                                IconButton(onClick = {}) {
                                                    Icon(Icons.Rounded.Check, "ยอมรับ", tint = Color(0xFF4CAF50))
                                                }
                                                IconButton(onClick = {}) {
                                                    Icon(Icons.Rounded.Close, "ปฏิเสธ", tint = MaterialTheme.colorScheme.error)
                                                }
                                            }
                                        }
                                        FriendStatus.Outgoing -> {
                                            IconButton(onClick = { friendToConfirm = friend to "cancel" }) {
                                                Icon(Icons.Rounded.Close, "ยกเลิกคำขอ")
                                            }
                                        }
                                        FriendStatus.Blocked -> {
                                            TextButton(onClick = { friendToConfirm = friend to "unblock" }) {
                                                Text("เลิกบล็อก")
                                            }
                                        }
                                        FriendStatus.Friend -> {
                                            IconButton(onClick = { selectedFriendForSheet = friend }) {
                                                Icon(Icons.Rounded.MoreVert, "ตัวเลือก")
                                            }
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            }

            if (friendToConfirm != null) {
                val (friend, action) = friendToConfirm!!
                AlertDialog(
                    onDismissRequest = { friendToConfirm = null },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                // TODO: Execute Action (Cancel or Unblock)
                                friendToConfirm = null
                            }
                        ) {
                            Text(if (action == "unblock") "เลิกบล็อก" else "ยกเลิกคำขอ")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { friendToConfirm = null }) { Text("ปิด") }
                    },
                    title = { Text(if (action == "unblock") "เลิกบล็อกผู้ใช้?" else "ยกเลิกคำขอเป็นเพื่อน?") },
                    text = {
                        Text(
                            if (action == "unblock") "คุณต้องการเลิกบล็อก ${friend.name} ใช่ไหม?"
                            else "ยืนยันการยกเลิกคำขอเป็นเพื่อนที่ส่งถึง ${friend.name} ใช่ไหม?"
                        )
                    }
                )
            }

            if (selectedFriendForSheet != null) {
                FriendActionSheet(
                    friend = selectedFriendForSheet!!,
                    sheetState = sheetState,
                    onDismissRequest = {
                        scope.launch { sheetState.hide() }.invokeOnCompletion { selectedFriendForSheet = null }
                    }
                )
            }
        }
    }
}

@Composable
fun EmptyListPlaceholder(tabTitle: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = "ไม่พบผู้ใช้", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.titleMedium)
            Text(text = "ในรายการ $tabTitle", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f), style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Preview(showBackground = true)
@Composable
fun ManageFriendsScreenPreview() {
    NekoShareTheme {
        ManageFriendsScreen(onBackClick = {})
    }
}
