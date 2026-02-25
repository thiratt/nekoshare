package com.thiratt.nekoshare.features.home.presentation.tabs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.constants.TransferRepository
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.home.model.TransferHistoryItem
import com.thiratt.nekoshare.features.home.presentation.components.FileDetailSheet
import com.thiratt.nekoshare.features.home.presentation.components.HomeTopAppBar
import com.thiratt.nekoshare.features.home.presentation.components.TransferHistoryCard
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeContent(
    onTransferItemClick: (String) -> Unit,
    isSearchActive: Boolean,
    searchQuery: String,
    focusRequester: FocusRequester,
    onSearchQueryChange: (String) -> Unit,
    onSearchActiveChange: (Boolean) -> Unit,
    onNotificationsClick: () -> Unit,
    onSettingsClick: () -> Unit,
    contentPadding: Dp = 0.dp
) {
    var selectedItem by remember { mutableStateOf<TransferHistoryItem?>(null) }
    val sheetState = rememberModalBottomSheetState()
    val scope = rememberCoroutineScope()
    val gridState = rememberLazyGridState()
    val transferHistoryList = remember { TransferRepository.mockTransfers }
    val normalizedQuery = searchQuery.trim()
    val filteredTransfers = remember(transferHistoryList, normalizedQuery) {
        if (normalizedQuery.isBlank()) {
            transferHistoryList
        } else {
            transferHistoryList.filter { item ->
                item.senderName.contains(normalizedQuery, ignoreCase = true) ||
                        item.files.any { file ->
                            file.name.contains(normalizedQuery, ignoreCase = true)
                        }
            }
        }
    }
    val topBarState = rememberTopAppBarState()

    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior(
        state = topBarState,
        canScroll = {
            gridState.canScrollForward || gridState.canScrollBackward || topBarState.collapsedFraction > 0f
        }
    )

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            HomeTopAppBar(
                isSearchActive = isSearchActive,
                searchQuery = searchQuery,
                title = "หน้าแรก",
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
            Column(modifier = Modifier.fillMaxSize()) {
                LazyVerticalGrid(
                    state = gridState,
                    columns = GridCells.Adaptive(minSize = 160.dp),
                    contentPadding = PaddingValues(
                        top = innerPadding.calculateTopPadding() + 8.dp,
                        start = 20.dp,
                        end = 20.dp,
                        bottom = contentPadding + 100.dp
                    ),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(filteredTransfers) { item ->
                        TransferHistoryCard(
                            item = item,
                            onClick = { onTransferItemClick(item.id) },
                            onMoreClick = { selectedItem = item }
                        )
                    }

                    if (filteredTransfers.isEmpty()) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Text(
                                text = "ไม่พบรายการที่ตรงกับ \"$searchQuery\"",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 24.dp)
                            )
                        }
                    }
                }
            }

            if (selectedItem != null) {
                FileDetailSheet(
                    item = selectedItem!!,
                    sheetState = sheetState,
                    onDismissRequest = {
                        scope.launch { sheetState.hide() }
                            .invokeOnCompletion { selectedItem = null }
                    },
                    onView = {
                        scope.launch { sheetState.hide() }.invokeOnCompletion {
                            val id = selectedItem!!.id
                            selectedItem = null
                            onTransferItemClick(id)
                        }
                    }
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun HomeContentPreview() {
    val focusRequester = remember { FocusRequester() }

    NekoShareTheme {
        HomeContent(
            onTransferItemClick = {},
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
