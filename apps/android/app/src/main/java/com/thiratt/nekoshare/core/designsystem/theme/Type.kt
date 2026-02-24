package com.thiratt.nekoshare.core.designsystem.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.thiratt.nekoshare.R

val LineSeedSansFont = FontFamily(
    Font(R.font.line_seed_sans_th_a_th, FontWeight.Thin),
    Font(R.font.line_seed_sans_th_a_rg, FontWeight.Normal),
    Font(R.font.line_seed_sans_th_a_bd, FontWeight.Bold),
    Font(R.font.line_seed_sans_th_a_x_bd, FontWeight.ExtraBold),
    Font(R.font.line_seed_sans_th_a_he, FontWeight.Black)
)

val baseline = Typography()

// Set of Material typography styles to start with
val Typography = Typography(
    displayLarge = baseline.displayLarge.copy(fontFamily = LineSeedSansFont),
    displayMedium = baseline.displayMedium.copy(fontFamily = LineSeedSansFont),
    displaySmall = baseline.displaySmall.copy(fontFamily = LineSeedSansFont),
    headlineLarge = baseline.headlineLarge.copy(fontFamily = LineSeedSansFont),
    headlineMedium = baseline.headlineMedium.copy(fontFamily = LineSeedSansFont),
    headlineSmall = baseline.headlineSmall.copy(fontFamily = LineSeedSansFont),
    titleLarge = baseline.titleLarge.copy(fontFamily = LineSeedSansFont),
    titleMedium = baseline.titleMedium.copy(fontFamily = LineSeedSansFont),
    titleSmall = baseline.titleSmall.copy(fontFamily = LineSeedSansFont),
    bodyLarge = baseline.bodyLarge.copy(fontFamily = LineSeedSansFont),
    bodyMedium = baseline.bodyMedium.copy(fontFamily = LineSeedSansFont),
    bodySmall = baseline.bodySmall.copy(fontFamily = LineSeedSansFont),
    labelLarge = baseline.labelLarge.copy(fontFamily = LineSeedSansFont),
    labelMedium = baseline.labelMedium.copy(fontFamily = LineSeedSansFont),
    labelSmall = baseline.labelSmall.copy(fontFamily = LineSeedSansFont),
)