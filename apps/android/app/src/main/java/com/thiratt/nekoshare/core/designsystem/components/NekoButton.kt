package com.thiratt.nekoshare.core.designsystem.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

enum class NekoButtonSize {
    Default,
    Xs,
    Sm,
    Lg,
    Icon
}

enum class NekoButtonVariant {
    Primary,
    Secondary,
    Outline,
    Ghost,
    Destructive,
    Link
}

@Composable
fun NekoButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: NekoButtonVariant = NekoButtonVariant.Primary,
    size: NekoButtonSize = NekoButtonSize.Default,
    enabled: Boolean = true,
    fullWidth: Boolean = false,
    icon: @Composable (RowScope.() -> Unit)? = null
) {
    val (height, horizontalPadding, textStyle, cornerRadius) = when (size) {
        NekoButtonSize.Default -> SizeConfig(50.dp, 16.dp, MaterialTheme.typography.labelLarge, 12.dp)
        NekoButtonSize.Xs -> SizeConfig(30.dp, 8.dp, MaterialTheme.typography.labelSmall, 6.dp)
        NekoButtonSize.Sm -> SizeConfig(36.dp, 12.dp, MaterialTheme.typography.labelMedium, 8.dp)
        NekoButtonSize.Lg -> SizeConfig(56.dp, 24.dp, MaterialTheme.typography.titleMedium, 12.dp)
        NekoButtonSize.Icon -> SizeConfig(50.dp, 0.dp, MaterialTheme.typography.labelLarge, 12.dp)
    }

    val shape = RoundedCornerShape(cornerRadius)

    var buttonModifier = modifier.height(height)

    buttonModifier = if (fullWidth) {
        buttonModifier.fillMaxWidth()
    } else if (size == NekoButtonSize.Icon) {
        buttonModifier.aspectRatio(1f)
    } else {
        buttonModifier
    }

    val contentPadding = if (size == NekoButtonSize.Icon) PaddingValues(0.dp) else PaddingValues(horizontal = horizontalPadding)

    when (variant) {
        NekoButtonVariant.Primary -> {
            Button(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled,
                shape = shape,
                contentPadding = contentPadding,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                )
            ) {
                ButtonContent(text, icon, textStyle)
            }
        }

        NekoButtonVariant.Secondary -> {
            Button(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled,
                shape = shape,
                contentPadding = contentPadding,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                    contentColor = MaterialTheme.colorScheme.onSecondaryContainer
                )
            ) {
                ButtonContent(text, icon, textStyle)
            }
        }

        NekoButtonVariant.Outline -> {
            OutlinedButton(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled,
                shape = shape,
                contentPadding = contentPadding,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                ButtonContent(text, icon, textStyle)
            }
        }

        NekoButtonVariant.Ghost -> {
            TextButton(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled,
                shape = shape,
                contentPadding = contentPadding,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = MaterialTheme.colorScheme.onSurface
                )
            ) {
                ButtonContent(text, icon, textStyle)
            }
        }

        NekoButtonVariant.Destructive -> {
            Button(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled,
                shape = shape,
                contentPadding = contentPadding,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error,
                    contentColor = MaterialTheme.colorScheme.onError
                )
            ) {
                ButtonContent(text, icon, textStyle)
            }
        }

        NekoButtonVariant.Link -> {
            TextButton(
                onClick = onClick,
                modifier = buttonModifier,
                enabled = enabled,
                shape = shape,
                contentPadding = contentPadding,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = MaterialTheme.colorScheme.primary
                )
            ) {
                ButtonContent(text, icon, textStyle.copy(textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline))
            }
        }
    }
}

private data class SizeConfig(
    val height: Dp,
    val padding: Dp,
    val textStyle: TextStyle,
    val cornerRadius: Dp
)

@Composable
private fun RowScope.ButtonContent(
    text: String,
    icon: @Composable (RowScope.() -> Unit)?,
    textStyle: TextStyle
) {
    ProvideTextStyle(value = textStyle) {
        if (icon != null) {
            icon()
            Spacer(Modifier.width(8.dp))
        }
        if (text.isNotEmpty()) {
            Text(text = text)
        }
    }
}