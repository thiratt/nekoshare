package com.thiratt.nekoshare.features.home.presentation

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.rounded.Devices
import androidx.compose.material.icons.rounded.SupervisorAccount
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.IntOffset
import androidx.lifecycle.viewmodel.compose.viewModel
import com.thiratt.nekoshare.core.designsystem.components.NekoNavigationBar
import com.thiratt.nekoshare.core.designsystem.model.NekoNavigationBarItem
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.home.model.DeviceItem
import com.thiratt.nekoshare.features.home.presentation.components.HomeTopAppBar
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
        onBottomNavSelected = viewModel::onBottomNavSelected
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
    onTransferItemClick: (transferId: String) -> Unit
) {
    var isSearchActive by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    val focusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current

    val tweenSpec: FiniteAnimationSpec<IntOffset> = tween(durationMillis = 300)
    val fadeSpec = tween<Float>(durationMillis = 300)

    BackHandler(enabled = isSearchActive) {
        isSearchActive = false
        searchQuery = ""
        focusManager.clearFocus()
    }

    LaunchedEffect(isSearchActive) {
        if (isSearchActive) {
            focusRequester.requestFocus()
        }
    }

    Scaffold(
        topBar = {
            val currentTitle = uiState.bottomNavItems.getOrNull(uiState.selectedIndex)?.name ?: "NekoShare"

            HomeTopAppBar(
                isSearchActive = isSearchActive,
                searchQuery = searchQuery,
                title = currentTitle,
                focusRequester = focusRequester,
                onSearchQueryChange = { searchQuery = it },
                onSearchActiveChange = { active ->
                    isSearchActive = active
                    if (!active) {
                        searchQuery = ""
                        focusManager.clearFocus()
                    }
                },
                onNotificationsClick = onNotificationsClick,
                onSettingsClick = onSettingsClick
            )
        },
//        floatingActionButton = {
//            HomeFloatingActionButton(
//                selectedIndex = uiState.selectedIndex,
//                onShareClick = onShareClick,
//                onAddFriends = onAddFriends
//            )
//        },
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0)
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = innerPadding.calculateTopPadding())
            ) {
                if (isSearchActive && searchQuery.isNotEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Searching for: $searchQuery")
                    }
                } else {
                    AnimatedContent(
                        targetState = uiState.selectedIndex,
                        transitionSpec = {
                            if (targetState > initialState) {
                                (slideInHorizontally(
                                    animationSpec = tweenSpec,
                                    initialOffsetX = { it / 2 }) + fadeIn(fadeSpec)) togetherWith
                                        (slideOutHorizontally(
                                            animationSpec = tweenSpec,
                                            targetOffsetX = { -it / 2 }) + fadeOut(fadeSpec))
                            } else {
                                (slideInHorizontally { width -> -width } + fadeIn(tween(300))) togetherWith
                                        (slideOutHorizontally { width -> width } + fadeOut(tween(300)))
                            }
                        },
                        label = "BottomNavAnimation"
                    ) { targetIndex ->
                        when (targetIndex) {
                            0 -> HomeContent(onTransferItemClick)
                            1 -> FriendsContent(onManageFriends)
                            2 -> DevicesContent()
                        }
                    }
                }

                if (uiState.isShareSheetOpen) {
                    ShareActionSheet(
                        onDismissRequest = onDismissShareSheet,
                        onDeviceSelected = onDeviceSelected,
                        onFileSelect = { /* Open File Picker */ },
                        onPhotoSelect = { /* Open Gallery */ }
                    )
                }
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

@Preview(showBackground = true)
@Composable
fun HomeScreenPreview() {
    NekoShareTheme {
        HomeScreen(
            uiState = HomeUiState(
                bottomNavItems = listOf(
                    NekoNavigationBarItem("Home", Icons.Default.Home),
                    NekoNavigationBarItem("Friends", Icons.Rounded.SupervisorAccount),
                    NekoNavigationBarItem("Devices", Icons.Rounded.Devices)
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
            onTransferItemClick = {}
        )
    }
}