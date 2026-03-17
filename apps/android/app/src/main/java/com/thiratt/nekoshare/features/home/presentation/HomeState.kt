package com.thiratt.nekoshare.features.home.presentation

import com.thiratt.nekoshare.core.designsystem.model.NekoNavigationBarItem
import com.thiratt.nekoshare.features.home.model.DeviceItem

data class HomeUiState(
    val selectedIndex: Int = 0,
    val bottomNavItems: List<NekoNavigationBarItem> = emptyList(),
    val isLoading: Boolean = false,
    val isShareSheetOpen: Boolean = false,
    val homeTabState: HomeTabState = HomeTabState(),
    val devicesTabState: DevicesTabUiState = DevicesTabUiState()
)

data class HomeTabState(
    val selectedFilter: String = "ทั้งหมด",
    val firstVisibleItemIndex: Int = 0,
    val firstVisibleItemScrollOffset: Int = 0
)

data class DevicesTabUiState(
    val devices: List<DeviceItem> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)
