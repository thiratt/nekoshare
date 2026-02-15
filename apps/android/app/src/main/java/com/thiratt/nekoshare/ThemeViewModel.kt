package com.thiratt.nekoshare

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class AppTheme {
    Light, Dark, System
}

class ThemeViewModel : ViewModel() {
    private val _theme = MutableStateFlow(AppTheme.System)
    val theme: StateFlow<AppTheme> = _theme.asStateFlow()

    fun setTheme(newTheme: AppTheme) {
        viewModelScope.launch {
            _theme.emit(newTheme)
        }
    }
}