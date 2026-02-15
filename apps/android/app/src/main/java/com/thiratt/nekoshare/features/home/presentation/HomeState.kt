package com.thiratt.nekoshare.features.home.presentation

import com.thiratt.nekoshare.core.designsystem.model.NekoNavigationBarItem

data class HomeUiState(
    val selectedIndex: Int = 0,
    val bottomNavItems: List<NekoNavigationBarItem> = emptyList(),
    val isLoading: Boolean = false,
    val isShareSheetOpen: Boolean = false
)