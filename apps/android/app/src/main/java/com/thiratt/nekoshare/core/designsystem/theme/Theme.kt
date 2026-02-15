package com.thiratt.nekoshare.core.designsystem.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowInsetsControllerCompat

private val DarkColorScheme = darkColorScheme(
    // Primary
    primary = DarkPrimary,
    onPrimary = DarkPrimaryForeground,
    primaryContainer = DarkSecondary,
    onPrimaryContainer = DarkSecondaryForeground,
    inversePrimary = DarkForeground,

    // Secondary
    secondary = DarkSecondary,
    onSecondary = DarkSecondaryForeground,
    secondaryContainer = DarkMuted,
    onSecondaryContainer = DarkMutedForeground,

    // Tertiary
    tertiary = DarkAccent,
    onTertiary = DarkAccentForeground,
    tertiaryContainer = DarkSidebar,
    onTertiaryContainer = DarkSidebarForeground,

    // Background & Surface
    background = DarkBackground,
    onBackground = DarkForeground,
    surface = DarkCard,
    onSurface = DarkCardForeground,
    surfaceVariant = DarkMuted,
    onSurfaceVariant = DarkMutedForeground,

    // Surface Container
    surfaceContainerLowest = DarkBackground,
    surfaceContainerLow = DarkCard,
    surfaceContainer = DarkCard,
    surfaceContainerHigh = DarkPopover,
    surfaceContainerHighest = DarkMuted,

    // Inverse
    inverseSurface = DarkForeground,
    inverseOnSurface = DarkBackground,

    // Error
    error = DarkDestructive,
    onError = DarkDestructiveForeground,
    errorContainer = DarkDestructive,
    onErrorContainer = DarkDestructiveForeground,

    // Outline
    outline = DarkBorder,
    outlineVariant = DarkInput,
    scrim = DarkForeground.copy(alpha = 0.6f)
)

private val LightColorScheme = lightColorScheme(
    // Primary
    primary = LightPrimary,
    onPrimary = LightPrimaryForeground,
    primaryContainer = LightSecondary,
    onPrimaryContainer = LightSecondaryForeground,
    inversePrimary = LightForeground,

    // Secondary
    secondary = LightSecondary,
    onSecondary = LightSecondaryForeground,
    secondaryContainer = LightMuted,
    onSecondaryContainer = LightMutedForeground,

    // Tertiary
    tertiary = LightAccent,
    onTertiary = LightAccentForeground,
    tertiaryContainer = LightSidebar,
    onTertiaryContainer = LightSidebarForeground,

    // Background & Surface
    background = LightBackground,
    onBackground = LightForeground,
    surface = LightCard,
    onSurface = LightCardForeground,
    surfaceVariant = LightMuted,
    onSurfaceVariant = LightMutedForeground,

    // Surface Container
    surfaceContainerLowest = LightBackground,
    surfaceContainerLow = LightCard,
    surfaceContainer = LightCard,
    surfaceContainerHigh = LightPopover,
    surfaceContainerHighest = LightMuted,

    // Inverse
    inverseSurface = LightForeground,
    inverseOnSurface = LightBackground,

    // Error
    error = LightDestructive,
    onError = LightDestructiveForeground,
    errorContainer = LightDestructive,
    onErrorContainer = LightDestructiveForeground,

    // Outline
    outline = LightBorder,
    outlineVariant = LightInput,
    scrim = LightForeground.copy(alpha = 0.6f)
)

@Composable
fun NekoShareTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.isNavigationBarContrastEnforced = false

            val insetsController = WindowInsetsControllerCompat(window, view)
            insetsController.isAppearanceLightStatusBars = !darkTheme
            insetsController.isAppearanceLightNavigationBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}