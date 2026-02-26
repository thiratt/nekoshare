package com.thiratt.nekoshare.features.home.presentation

import com.thiratt.nekoshare.core.designsystem.model.NekoNavigationBarItem

data class HomeUiState(
    val selectedIndex: Int = 0,
    val bottomNavItems: List<NekoNavigationBarItem> = emptyList(),
    val isLoading: Boolean = false,
    val isShareSheetOpen: Boolean = false,
    val homeTabState: HomeTabState = HomeTabState()
)

data class HomeTabState(
    val selectedFilter: String = "ทั้งหมด",
    val firstVisibleItemIndex: Int = 0,
    val firstVisibleItemScrollOffset: Int = 0
)
