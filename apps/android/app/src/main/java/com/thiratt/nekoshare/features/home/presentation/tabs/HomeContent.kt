package com.thiratt.nekoshare.features.home.presentation.tabs

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PrimaryScrollableTabRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberTopAppBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.util.lerp
import com.thiratt.nekoshare.constants.TransferRepository
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.home.model.TransferDirection
import com.thiratt.nekoshare.features.home.model.TransferHistoryItem
import com.thiratt.nekoshare.features.home.model.TransferStatus
import com.thiratt.nekoshare.features.home.presentation.components.FileDetailSheet
import com.thiratt.nekoshare.features.home.presentation.components.HomeTopAppBar
import com.thiratt.nekoshare.features.home.presentation.components.TransferHistoryCard
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeContent(
    onTransferItemClick: (String) -> Unit,
    isSearchActive: Boolean,
    searchQuery: String,
    selectedFilter: String,
    initialFirstVisibleItemIndex: Int,
    initialFirstVisibleItemScrollOffset: Int,
    focusRequester: FocusRequester,
    onSearchQueryChange: (String) -> Unit,
    onSearchActiveChange: (Boolean) -> Unit,
    onNotificationsClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onFilterSelected: (String) -> Unit,
    onScrollPositionChange: (Int, Int) -> Unit,
    contentPadding: Dp = 0.dp
) {
    var selectedItem by remember { mutableStateOf<TransferHistoryItem?>(null) }
    val sheetState = rememberModalBottomSheetState()
    val scope = rememberCoroutineScope()
    val gridState = rememberLazyGridState(
        initialFirstVisibleItemIndex = initialFirstVisibleItemIndex,
        initialFirstVisibleItemScrollOffset = initialFirstVisibleItemScrollOffset
    )
    val transferHistoryList = remember { TransferRepository.mockTransfers }

    val filterTabs = listOf("ทั้งหมด", "ได้รับ", "กำลังส่ง", "ส่งสำเร็จ", "ล้มเหลว")
    val activeSelectedFilter = selectedFilter
        .takeIf { it in filterTabs }
        ?: filterTabs[0]

    LaunchedEffect(gridState) {
        snapshotFlow {
            gridState.firstVisibleItemIndex to gridState.firstVisibleItemScrollOffset
        }
            .distinctUntilChanged()
            .collectLatest { (index, offset) ->
                onScrollPositionChange(index, offset)
            }
    }

    val normalizedQuery = searchQuery.trim()
    val filteredTransfers = remember(transferHistoryList, normalizedQuery, activeSelectedFilter) {
        val selectedFilterIndex = filterTabs.indexOf(activeSelectedFilter).coerceAtLeast(0)

        var list = when (selectedFilterIndex) {
            1 -> transferHistoryList.filter { transfer ->
                transfer.direction == TransferDirection.Incoming &&
                    transfer.status == TransferStatus.Success
            }
            2 -> transferHistoryList.filter { transfer ->
                transfer.direction == TransferDirection.Outgoing &&
                    transfer.status == TransferStatus.Transferring
            }
            3 -> transferHistoryList.filter { transfer ->
                transfer.direction == TransferDirection.Outgoing &&
                    transfer.status == TransferStatus.Success
            }
            4 -> transferHistoryList.filter { transfer ->
                transfer.status == TransferStatus.Failed
            }
            else -> transferHistoryList
        }

        if (normalizedQuery.isNotBlank()) {
            list = list.filter { item ->
                item.senderName.contains(normalizedQuery, ignoreCase = true) ||
                    item.files.any { file ->
                        file.name.contains(normalizedQuery, ignoreCase = true)
                    }
            }
        }
        list
    }

    val topBarState = rememberTopAppBarState()
    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior(
        state = topBarState,
        canScroll = {
            gridState.canScrollForward || gridState.canScrollBackward || topBarState.collapsedFraction > 0f
        }
    )

    val collapsedFraction = scrollBehavior.state.collapsedFraction
    val bgColor = MaterialTheme.colorScheme.background
    val solidStop = lerp(start = 0.90f, stop = 0.85f, fraction = collapsedFraction)

    val unifiedHeaderBrush = Brush.verticalGradient(
        0.0f to bgColor,
        solidStop to bgColor.copy(alpha = 0.95f),
        1.0f to bgColor.copy(alpha = 0f)
    )

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(unifiedHeaderBrush)
                    .padding(bottom = 8.dp)
            ) {
                HomeTopAppBar(
                    isSearchActive = isSearchActive,
                    searchQuery = searchQuery,
                    title = "หน้าแรก",
                    focusRequester = focusRequester,
                    customBackgroundBrush = SolidColor(Color.Transparent),
                    scrollBehavior = scrollBehavior,
                    onSearchQueryChange = onSearchQueryChange,
                    onSearchActiveChange = onSearchActiveChange,
                    onNotificationsClick = onNotificationsClick,
                    onSettingsClick = onSettingsClick
                )

                AnimatedVisibility(
                    visible = !isSearchActive,
                    enter = fadeIn(animationSpec = tween(300)) +
                        expandVertically(
                            expandFrom = Alignment.Top,
                            animationSpec = tween(300)
                        ) +
                        scaleIn(
                            initialScale = 0.9f,
                            transformOrigin = TransformOrigin(0.5f, 0f),
                            animationSpec = tween(300)
                        ),
                    exit = fadeOut(animationSpec = tween(250)) +
                        shrinkVertically(
                            shrinkTowards = Alignment.Top,
                            animationSpec = tween(250)
                        ) +
                        scaleOut(
                            targetScale = 0.9f,
                            transformOrigin = TransformOrigin(0.5f, 0f),
                            animationSpec = tween(250)
                        )
                ) {
                    TransferFilterTabs(
                        tabs = filterTabs,
                        selectedFilter = activeSelectedFilter,
                        onFilterSelected = onFilterSelected,
                        transferHistoryList = transferHistoryList
                    )
                }
            }
        },
        containerColor = Color.Transparent
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                LazyVerticalGrid(
                    state = gridState,
                    columns = GridCells.Adaptive(minSize = 160.dp),
                    contentPadding = PaddingValues(
                        top = innerPadding.calculateTopPadding(),
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
                                text = "ไม่พบรายการที่ค้นหา",
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

            selectedItem?.let { selected ->
                FileDetailSheet(
                    item = selected,
                    sheetState = sheetState,
                    onDismissRequest = {
                        scope.launch { sheetState.hide() }
                            .invokeOnCompletion {
                                if (selectedItem?.id == selected.id) {
                                    selectedItem = null
                                }
                            }
                    },
                    onView = {
                        val selectedId = selected.id
                        scope.launch { sheetState.hide() }.invokeOnCompletion {
                            selectedItem = null
                            onTransferItemClick(selectedId)
                        }
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TransferFilterTabs(
    tabs: List<String>,
    selectedFilter: String,
    onFilterSelected: (String) -> Unit,
    transferHistoryList: List<TransferHistoryItem>,
    modifier: Modifier = Modifier
) {
    val selectedTabIndex = tabs.indexOf(selectedFilter).coerceAtLeast(0)

    Box(modifier = modifier) {
        PrimaryScrollableTabRow(
            selectedTabIndex = selectedTabIndex,
            edgePadding = 20.dp,
            containerColor = Color.Transparent,
            contentColor = MaterialTheme.colorScheme.primary,
            divider = {},
            indicator = {}
        ) {
            tabs.forEachIndexed { index, tab ->
                val isSelected = selectedTabIndex == index

                val count = when (index) {
                    0 -> transferHistoryList.size
                    1 -> transferHistoryList.count { transfer ->
                        transfer.direction == TransferDirection.Incoming &&
                            transfer.status == TransferStatus.Success
                    }
                    2 -> transferHistoryList.count { transfer ->
                        transfer.direction == TransferDirection.Outgoing &&
                            transfer.status == TransferStatus.Transferring
                    }
                    3 -> transferHistoryList.count { transfer ->
                        transfer.direction == TransferDirection.Outgoing &&
                            transfer.status == TransferStatus.Success
                    }
                    4 -> transferHistoryList.count { transfer ->
                        transfer.status == TransferStatus.Failed
                    }
                    else -> 0
                }

                Box(
                    modifier = Modifier
                        .padding(end = 8.dp)
                        .height(36.dp)
                        .clip(CircleShape)
                        .background(
                            if (isSelected) MaterialTheme.colorScheme.secondaryContainer
                            else Color.Transparent
                        )
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() }
                        ) { onFilterSelected(tab) }
                        .padding(horizontal = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (index == 0) tab else "$tab ($count)",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) {
                            MaterialTheme.colorScheme.onSecondaryContainer
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        }
                    )
                }
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
            selectedFilter = "ทั้งหมด",
            initialFirstVisibleItemIndex = 0,
            initialFirstVisibleItemScrollOffset = 0,
            focusRequester = focusRequester,
            onSearchQueryChange = {},
            onSearchActiveChange = {},
            onNotificationsClick = {},
            onSettingsClick = {},
            onFilterSelected = {},
            onScrollPositionChange = { _, _ -> }
        )
    }
}
