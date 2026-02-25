package com.thiratt.nekoshare.core.designsystem.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Devices
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.SupervisorAccount
import androidx.compose.material.icons.rounded.Devices
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.SupervisorAccount
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.thiratt.nekoshare.core.designsystem.model.NekoNavigationBarItem
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme

@Composable
fun NekoNavigationBar(
    items: List<NekoNavigationBarItem>,
    selectedItem: Int,
    onItemClick: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    var hoveredIndex by remember { mutableStateOf<Int?>(null) }

    val targetIndex = hoveredIndex ?: selectedItem

    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color.Transparent,
                        MaterialTheme.colorScheme.background
                    )
                )
            ),
        contentAlignment = Alignment.BottomCenter
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .padding(horizontal = 40.dp)
                .padding(bottom = 12.dp)
                .navigationBarsPadding()
                .widthIn(max = 400.dp)
                .fillMaxWidth()
                .height(60.dp)
                .shadow(4.dp, CircleShape)
                .background(MaterialTheme.colorScheme.surfaceContainerHigh, CircleShape)
                .padding(6.dp)
        ) {
            val tabWidthDp = maxWidth / items.size

            val indicatorOffset by animateDpAsState(
                targetValue = tabWidthDp * targetIndex,
                animationSpec = spring(
                    dampingRatio = Spring.DampingRatioLowBouncy,
                    stiffness = Spring.StiffnessLow
                ),
                label = "indicatorOffset"
            )

            Box(
                modifier = Modifier
                    .offset(x = indicatorOffset)
                    .width(tabWidthDp)
                    .fillMaxHeight()
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
            )

            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(items.size) {
                        awaitEachGesture {
                            val down = awaitFirstDown()
                            val tabWidthPx = size.width / items.size

                            var currentIndex =
                                (down.position.x / tabWidthPx).toInt().coerceIn(0, items.size - 1)
                            hoveredIndex = currentIndex

                            do {
                                val event = awaitPointerEvent()
                                val change = event.changes.firstOrNull()

                                if (change != null && change.pressed) {
                                    currentIndex = (change.position.x / tabWidthPx).toInt()
                                        .coerceIn(0, items.size - 1)
                                    if (hoveredIndex != currentIndex) {
                                        hoveredIndex = currentIndex
                                    }
                                }
                            } while (event.changes.any { it.pressed })

                            onItemClick(currentIndex)
                            hoveredIndex = null
                        }
                    },
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                items.forEachIndexed { index, item ->
                    NekoNavItem(
                        item = item,
                        isTargeted = targetIndex == index,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
fun NekoNavItem(
    item: NekoNavigationBarItem,
    isTargeted: Boolean,
    modifier: Modifier = Modifier
) {
    val iconColor by animateColorAsState(
        targetValue = if (isTargeted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
        animationSpec = tween(300),
        label = "iconColor"
    )
    val textColor by animateColorAsState(
        targetValue = if (isTargeted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
        animationSpec = tween(300),
        label = "textColor"
    )

    Box(
        modifier = modifier
            .fillMaxHeight()
            .clip(CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = if (isTargeted && item.selectedIcon != null) item.selectedIcon else item.icon,
                contentDescription = item.name,
                tint = iconColor,
                modifier = Modifier.size(24.dp)
            )
            Text(
                text = item.name,
                style = MaterialTheme.typography.labelSmall,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = textColor
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun NekoNavigationBarPreview() {
    val items = listOf(
        NekoNavigationBarItem("Home", Icons.Outlined.Home, Icons.Rounded.Home),
        NekoNavigationBarItem("Friends", Icons.Outlined.SupervisorAccount, Icons.Rounded.SupervisorAccount),
        NekoNavigationBarItem("Devices", Icons.Outlined.Devices, Icons.Rounded.Devices)
    )

    var selected by remember { mutableIntStateOf(0) }

    NekoShareTheme {
        NekoNavigationBar(items, selected, { selected = it })
    }
}