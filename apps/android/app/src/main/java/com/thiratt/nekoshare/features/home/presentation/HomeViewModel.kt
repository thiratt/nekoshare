package com.thiratt.nekoshare.features.home.presentation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.rounded.Devices
import androidx.compose.material.icons.rounded.SupervisorAccount
import androidx.lifecycle.ViewModel
import com.thiratt.nekoshare.core.designsystem.model.NekoNavigationBarItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class HomeViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(HomeUiState())

    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        val items = listOf(
            NekoNavigationBarItem("Home", Icons.Default.Home),
            NekoNavigationBarItem("Friends", Icons.Rounded.SupervisorAccount),
            NekoNavigationBarItem("Devices", Icons.Rounded.Devices)
        )
        _uiState.update { it.copy(bottomNavItems = items) }
    }

    fun onBottomNavSelected(index: Int) {
        _uiState.update { it.copy(selectedIndex = index) }
    }

    fun toggleShareSheet(isOpen: Boolean) {
        _uiState.update { it.copy(isShareSheetOpen = isOpen) }
    }
}