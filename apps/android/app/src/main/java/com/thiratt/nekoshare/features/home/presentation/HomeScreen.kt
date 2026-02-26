package com.thiratt.nekoshare.features.home.presentation

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.rounded.Devices
import androidx.compose.material.icons.rounded.SupervisorAccount
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.thiratt.nekoshare.core.designsystem.components.NekoNavigationBar
import com.thiratt.nekoshare.core.designsystem.model.NekoNavigationBarItem
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.home.model.DeviceItem
import com.thiratt.nekoshare.features.home.presentation.components.HomeFloatingActionButton
import com.thiratt.nekoshare.features.home.presentation.components.ShareActionSheet
import com.thiratt.nekoshare.features.home.presentation.tabs.DevicesContent
import com.thiratt.nekoshare.features.home.presentation.tabs.FriendsContent
import com.thiratt.nekoshare.features.home.presentation.tabs.HomeContent

sealed interface HomeNavEvent {
    data object Settings : HomeNavEvent
    data object Share : HomeNavEvent
    data object AddFriends : HomeNavEvent
    data object ManageFriends : HomeNavEvent
    data object Notifications : HomeNavEvent
    data class TransferItem(val transferId: String) : HomeNavEvent
}

@Composable
fun HomeRoute(
    onNavigate: (HomeNavEvent) -> Unit,
    viewModel: HomeViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    HomeScreen(
        uiState = uiState,
        onSettingsClick = { onNavigate(HomeNavEvent.Settings) },
        onShareClick = { viewModel.toggleShareSheet(true) },
        onAddFriends = { onNavigate(HomeNavEvent.AddFriends) },
        onManageFriends = { onNavigate(HomeNavEvent.ManageFriends) },
        onNotificationsClick = { onNavigate(HomeNavEvent.Notifications) },
        onDismissShareSheet = { viewModel.toggleShareSheet(false) },
        onDeviceSelected = { viewModel.toggleShareSheet(false) },
        onTransferItemClick = { transferId ->
            onNavigate(HomeNavEvent.TransferItem(transferId))
        },
        onBottomNavSelected = viewModel::onBottomNavSelected,
        onHomeFilterSelected = viewModel::onHomeFilterSelected,
        onHomeScrollPositionChanged = viewModel::onHomeScrollPositionChanged
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    uiState: HomeUiState,
    onSettingsClick: () -> Unit,
    onShareClick: () -> Unit,
    onAddFriends: () -> Unit,
    onManageFriends: () -> Unit,
    onNotificationsClick: () -> Unit,
    onBottomNavSelected: (Int) -> Unit,
    onDismissShareSheet: () -> Unit,
    onDeviceSelected: (DeviceItem) -> Unit,
    onTransferItemClick: (transferId: String) -> Unit,
    onHomeFilterSelected: (String) -> Unit,
    onHomeScrollPositionChanged: (Int, Int) -> Unit
) {
    var tabSearchStates by remember {
        mutableStateOf(List(HOME_TAB_COUNT) { TabSearchState() })
    }

    val focusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current
    val selectedIndex = uiState.selectedIndex.coerceIn(0, tabSearchStates.lastIndex)
    val currentSearchState = tabSearchStates[selectedIndex]
    val isSearchActive = currentSearchState.isActive
    val searchQuery = currentSearchState.query

    fun updateCurrentTabSearchState(
        update: (TabSearchState) -> TabSearchState
    ) {
        tabSearchStates = tabSearchStates.toMutableList().apply {
            this[selectedIndex] = update(this[selectedIndex])
        }
    }

    BackHandler(enabled = isSearchActive) {
        updateCurrentTabSearchState { TabSearchState() }
        focusManager.clearFocus()
    }

    LaunchedEffect(selectedIndex, isSearchActive) {
        if (isSearchActive) focusRequester.requestFocus()
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Box(
            modifier = Modifier.fillMaxSize()
        ) {
            HomeTabsContent(
                selectedIndex = uiState.selectedIndex,
                homeTabState = uiState.homeTabState,
                onTransferItemClick = onTransferItemClick,
                onManageFriends = onManageFriends,
                isSearchActive = isSearchActive,
                searchQuery = searchQuery,
                focusRequester = focusRequester,
                onSearchQueryChange = { query ->
                    updateCurrentTabSearchState { current ->
                        current.copy(query = query)
                    }
                },
                onSearchActiveChange = { active ->
                    updateCurrentTabSearchState { current ->
                        if (active) current.copy(isActive = true) else TabSearchState()
                    }
                    if (!active) {
                        focusManager.clearFocus()
                    }
                },
                onNotificationsClick = onNotificationsClick,
                onSettingsClick = onSettingsClick,
                onHomeFilterSelected = onHomeFilterSelected,
                onHomeScrollPositionChanged = onHomeScrollPositionChanged
            )

            if (uiState.isShareSheetOpen) {
                ShareActionSheet(
                    onDismissRequest = onDismissShareSheet,
                    onDeviceSelected = onDeviceSelected,
                    onFileSelect = { /* Open File Picker */ },
                    onPhotoSelect = { /* Open Gallery */ }
                )
            }

            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 8.dp, bottom = 90.dp)
            ) {
                HomeFloatingActionButton(
                    selectedIndex = uiState.selectedIndex,
                    onShareClick = onShareClick,
                    onAddFriends = onAddFriends
                )
            }

            NekoNavigationBar(
                items = uiState.bottomNavItems,
                selectedItem = uiState.selectedIndex,
                onItemClick = onBottomNavSelected,
                modifier = Modifier.align(Alignment.BottomCenter)
            )
        }
    }
}

private data class TabSearchState(
    val isActive: Boolean = false,
    val query: String = ""
)

private const val HOME_TAB_COUNT = 3

@Composable
private fun HomeTabsContent(
    selectedIndex: Int,
    homeTabState: HomeTabState,
    onTransferItemClick: (String) -> Unit,
    onManageFriends: () -> Unit,
    isSearchActive: Boolean,
    searchQuery: String,
    focusRequester: FocusRequester,
    onSearchQueryChange: (String) -> Unit,
    onSearchActiveChange: (Boolean) -> Unit,
    onNotificationsClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onHomeFilterSelected: (String) -> Unit,
    onHomeScrollPositionChanged: (Int, Int) -> Unit
) {
    val saveableStateHolder = rememberSaveableStateHolder()

    AnimatedContent(
        targetState = selectedIndex,
        transitionSpec = { getTabTransitionSpec() },
        label = "BottomNavAnimation"
    ) { targetIndex ->
        saveableStateHolder.SaveableStateProvider(targetIndex) {
            when (targetIndex) {
                0 -> HomeContent(
                    onTransferItemClick = onTransferItemClick,
                    isSearchActive = isSearchActive,
                    searchQuery = searchQuery,
                    selectedFilter = homeTabState.selectedFilter,
                    initialFirstVisibleItemIndex = homeTabState.firstVisibleItemIndex,
                    initialFirstVisibleItemScrollOffset = homeTabState.firstVisibleItemScrollOffset,
                    focusRequester = focusRequester,
                    onSearchQueryChange = onSearchQueryChange,
                    onSearchActiveChange = onSearchActiveChange,
                    onNotificationsClick = onNotificationsClick,
                    onSettingsClick = onSettingsClick,
                    onFilterSelected = onHomeFilterSelected,
                    onScrollPositionChange = onHomeScrollPositionChanged
                )

                1 -> FriendsContent(
                    onManageFriends = onManageFriends,
                    isSearchActive = isSearchActive,
                    searchQuery = searchQuery,
                    focusRequester = focusRequester,
                    onSearchQueryChange = onSearchQueryChange,
                    onSearchActiveChange = onSearchActiveChange,
                    onNotificationsClick = onNotificationsClick,
                    onSettingsClick = onSettingsClick
                )

                2 -> DevicesContent(
                    isSearchActive = isSearchActive,
                    searchQuery = searchQuery,
                    focusRequester = focusRequester,
                    onSearchQueryChange = onSearchQueryChange,
                    onSearchActiveChange = onSearchActiveChange,
                    onNotificationsClick = onNotificationsClick,
                    onSettingsClick = onSettingsClick
                )
            }
        }
    }
}

private fun AnimatedContentTransitionScope<Int>.getTabTransitionSpec() = run {
    val tweenSpec = tween<Float>(durationMillis = 300)
    val tweenOffset = tween<IntOffset>(durationMillis = 300)

    if (targetState > initialState) {
        (slideInHorizontally(animationSpec = tweenOffset) { it / 2 } + fadeIn(tweenSpec)) togetherWith
                (slideOutHorizontally(animationSpec = tweenOffset) { -it / 2 } + fadeOut(tweenSpec))
    } else {
        (slideInHorizontally(animationSpec = tweenOffset) { -it / 2 } + fadeIn(tweenSpec)) togetherWith
                (slideOutHorizontally(animationSpec = tweenOffset) { it / 2 } + fadeOut(tweenSpec))
    }
}

@Preview(showBackground = true)
@Composable
fun HomeScreenPreview() {
    NekoShareTheme {
        HomeScreen(
            uiState = HomeUiState(
                bottomNavItems = listOf(
                    NekoNavigationBarItem("หน้าแรก", Icons.Default.Home),
                    NekoNavigationBarItem("เพื่อน", Icons.Rounded.SupervisorAccount),
                    NekoNavigationBarItem("อุปกรณ์", Icons.Rounded.Devices)
                ),
                selectedIndex = 0
            ),
            onSettingsClick = {},
            onShareClick = {},
            onAddFriends = {},
            onManageFriends = {},
            onNotificationsClick = {},
            onBottomNavSelected = {},
            onDismissShareSheet = {},
            onDeviceSelected = {},
            onTransferItemClick = {},
            onHomeFilterSelected = {},
            onHomeScrollPositionChanged = { _, _ -> }
        )
    }
}
