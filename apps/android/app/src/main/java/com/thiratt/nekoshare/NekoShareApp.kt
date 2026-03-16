package com.thiratt.nekoshare

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import com.thiratt.nekoshare.app.navigation.AppNavGraph
import com.thiratt.nekoshare.core.navigation.HomeRoot
import com.thiratt.nekoshare.core.navigation.Welcome
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.auth.data.AuthRepository
import com.thiratt.nekoshare.features.auth.data.SessionRestoreResult

@Composable
fun NekoShareApp(
    themeViewModel: ThemeViewModel = viewModel()
) {
    val currentTheme by themeViewModel.theme.collectAsState()
    val context = LocalContext.current
    val authRepository = remember(context) { AuthRepository(context.applicationContext) }
    val startDestination = remember { mutableStateOf<Any?>(null) }

    val isDarkTheme = when (currentTheme) {
        AppTheme.Light -> false
        AppTheme.Dark -> true
        AppTheme.System -> isSystemInDarkTheme()
    }

    LaunchedEffect(authRepository) {
        startDestination.value = when (authRepository.restoreSession()) {
            is SessionRestoreResult.Authenticated -> HomeRoot
            SessionRestoreResult.SignedOut -> Welcome
        }
    }

    NekoShareTheme(darkTheme = isDarkTheme) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            val destination = startDestination.value

            if (destination == null) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                AppNavGraph(
                    themeViewModel = themeViewModel,
                    startDestination = destination,
                    authRepository = authRepository
                )
            }
        }
    }
}
