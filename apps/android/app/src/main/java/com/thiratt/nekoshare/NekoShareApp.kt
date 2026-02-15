package com.thiratt.nekoshare

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.thiratt.nekoshare.app.navigation.AppNavGraph
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme

@Composable
fun NekoShareApp(
    themeViewModel: ThemeViewModel = viewModel()
) {
    val currentTheme by themeViewModel.theme.collectAsState()

    val isDarkTheme = when (currentTheme) {
        AppTheme.Light -> false
        AppTheme.Dark -> true
        AppTheme.System -> isSystemInDarkTheme()
    }

    NekoShareTheme(darkTheme = isDarkTheme) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            AppNavGraph(themeViewModel = themeViewModel)
        }
    }
}