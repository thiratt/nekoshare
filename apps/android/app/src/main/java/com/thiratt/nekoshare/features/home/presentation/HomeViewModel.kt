package com.thiratt.nekoshare.features.home.presentation

import android.app.Application
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Devices
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.SupervisorAccount
import androidx.compose.material.icons.rounded.Devices
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.SupervisorAccount
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.thiratt.nekoshare.core.designsystem.model.NekoNavigationBarItem
import com.thiratt.nekoshare.features.home.data.DevicesLoadResult
import com.thiratt.nekoshare.features.home.data.DevicesRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class HomeViewModel(application: Application) : AndroidViewModel(application) {
    private val _uiState = MutableStateFlow(HomeUiState())
    private val devicesRepository = DevicesRepository(application.applicationContext)

    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        val items = listOf(
            NekoNavigationBarItem("หน้าแรก", Icons.Outlined.Home, Icons.Rounded.Home),
            NekoNavigationBarItem("เพื่อน", Icons.Outlined.SupervisorAccount, Icons.Rounded.SupervisorAccount),
            NekoNavigationBarItem("อุปกรณ์", Icons.Outlined.Devices, Icons.Rounded.Devices)
        )
        _uiState.update { it.copy(bottomNavItems = items) }
        loadDevices()
    }

    fun onBottomNavSelected(index: Int) {
        _uiState.update { it.copy(selectedIndex = index) }
    }

    fun toggleShareSheet(isOpen: Boolean) {
        _uiState.update { it.copy(isShareSheetOpen = isOpen) }
    }

    fun loadDevices() {
        viewModelScope.launch {
            _uiState.update { current ->
                current.copy(
                    devicesTabState = current.devicesTabState.copy(
                        isLoading = true,
                        errorMessage = null
                    )
                )
            }

            when (val result = devicesRepository.fetchDevices()) {
                is DevicesLoadResult.Success -> {
                    _uiState.update { current ->
                        current.copy(
                            devicesTabState = DevicesTabUiState(
                                devices = result.devices,
                                isLoading = false,
                                errorMessage = null
                            )
                        )
                    }
                }

                is DevicesLoadResult.Failure -> {
                    _uiState.update { current ->
                        current.copy(
                            devicesTabState = current.devicesTabState.copy(
                                isLoading = false,
                                errorMessage = result.message
                            )
                        )
                    }
                }
            }
        }
    }

    fun onHomeFilterSelected(filter: String) {
        _uiState.update { current ->
            if (current.homeTabState.selectedFilter == filter) {
                current
            } else {
                current.copy(homeTabState = current.homeTabState.copy(selectedFilter = filter))
            }
        }
    }

    fun onHomeScrollPositionChanged(
        firstVisibleItemIndex: Int,
        firstVisibleItemScrollOffset: Int
    ) {
        _uiState.update { current ->
            val currentState = current.homeTabState
            if (
                currentState.firstVisibleItemIndex == firstVisibleItemIndex &&
                currentState.firstVisibleItemScrollOffset == firstVisibleItemScrollOffset
            ) {
                current
            } else {
                current.copy(
                    homeTabState = currentState.copy(
                        firstVisibleItemIndex = firstVisibleItemIndex,
                        firstVisibleItemScrollOffset = firstVisibleItemScrollOffset
                    )
                )
            }
        }
    }
}
