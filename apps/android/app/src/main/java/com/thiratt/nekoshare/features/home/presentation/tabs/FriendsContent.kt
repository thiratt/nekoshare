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
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberTopAppBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.home.model.Friend
import com.thiratt.nekoshare.features.home.model.FriendStatus
import com.thiratt.nekoshare.features.home.presentation.components.FriendActionSheet
import com.thiratt.nekoshare.features.home.presentation.components.FriendItem
import com.thiratt.nekoshare.features.home.presentation.components.HomeTopAppBar
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsContent(
    onManageFriends: () -> Unit,
    isSearchActive: Boolean,
    searchQuery: String,
    focusRequester: FocusRequester,
    onSearchQueryChange: (String) -> Unit,
    onSearchActiveChange: (Boolean) -> Unit,
    onNotificationsClick: () -> Unit,
    onSettingsClick: () -> Unit
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
    val normalizedQuery = searchQuery.trim()
    val filteredFriends = remember(onlyFriends, normalizedQuery) {
        if (normalizedQuery.isBlank()) {
            onlyFriends
        } else {
            onlyFriends.filter { friend ->
                friend.name.contains(normalizedQuery, ignoreCase = true) ||
                        friend.username.contains(normalizedQuery, ignoreCase = true)
            }
        }
    }

    var selectedFriendForSheet by remember { mutableStateOf<Friend?>(null) }
    val sheetState = rememberModalBottomSheetState()
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val topBarState = rememberTopAppBarState()
    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior(
        state = topBarState,
        canScroll = {
            listState.canScrollForward || listState.canScrollBackward || topBarState.collapsedFraction > 0f
        }
    )

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            HomeTopAppBar(
                isSearchActive = isSearchActive,
                searchQuery = searchQuery,
                title = "เพื่อน",
                focusRequester = focusRequester,
                scrollBehavior = scrollBehavior,
                onSearchQueryChange = onSearchQueryChange,
                onSearchActiveChange = onSearchActiveChange,
                onNotificationsClick = onNotificationsClick,
                onSettingsClick = onSettingsClick
            )
        },
        containerColor = Color.Transparent
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize()) {
            LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    top = innerPadding.calculateTopPadding(),
                    start = 16.dp,
                    end = 16.dp,
                    bottom = 80.dp
                ),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    FriendsHeader(
                        count = filteredFriends.size,
                        onMoreClick = onManageFriends
                    )
                }

                items(filteredFriends) { friend ->
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

                if (filteredFriends.isEmpty()) {
                    item {
                        Text(
                            text = if (normalizedQuery.isBlank()) {
                                "ไม่พบเพื่อน ลองตรวจสอบคำขอในเมนูจัดการ"
                            } else {
                                "ไม่พบเพื่อนที่ตรงกับ \"$searchQuery\""
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 32.dp)
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
}

@Composable
private fun FriendsHeader(
    count: Int,
    onMoreClick: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "เพื่อน ($count)",
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold
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
    val focusRequester = remember { FocusRequester() }

    NekoShareTheme {
        FriendsContent(
            onManageFriends = {},
            isSearchActive = false,
            searchQuery = "",
            focusRequester = focusRequester,
            onSearchQueryChange = {},
            onSearchActiveChange = {},
            onNotificationsClick = {},
            onSettingsClick = {}
        )
    }
}
