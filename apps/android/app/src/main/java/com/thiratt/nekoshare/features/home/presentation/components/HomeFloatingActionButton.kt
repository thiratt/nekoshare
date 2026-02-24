package com.thiratt.nekoshare.features.home.presentation.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.rounded.PersonAdd
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp

@Composable
fun HomeFloatingActionButton(
    selectedIndex: Int,
    onShareClick: () -> Unit,
    onAddFriends: () -> Unit,
    modifier: Modifier = Modifier
) {
    AnimatedContent(
        targetState = selectedIndex,
        contentAlignment = Alignment.BottomEnd,
        modifier = modifier,
        transitionSpec = { getFabTransitionSpec() },
        label = "FabAnimation"
    ) { index ->
        when (index) {
            0 -> FabItem("แชร์", Icons.Outlined.Share, onShareClick)
            1 -> FabItem("เพิ่มเพื่อน", Icons.Rounded.PersonAdd, onAddFriends)
            2 -> Spacer(Modifier.size(0.dp))
        }
    }
}

@Composable
private fun FabItem(
    text: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    ExtendedFloatingActionButton(
        text = { Text(text) },
        icon = { Icon(icon, contentDescription = text) },
        onClick = onClick,
        expanded = true
    )
}

private fun AnimatedContentTransitionScope<Int>.getFabTransitionSpec(): ContentTransform {
    val tweenSpec = tween<Float>(durationMillis = 300)
    val tweenOffset = tween<IntOffset>(durationMillis = 300)

    val transition = when {
        targetState == 2 -> {
            EnterTransition.None togetherWith
                    (slideOutVertically(tweenOffset) { it } + fadeOut(tweenSpec))
        }
        initialState == 2 -> {
            (slideInVertically(tweenOffset) { it } + fadeIn(tweenSpec)) togetherWith
                    ExitTransition.None
        }
        targetState > initialState -> {
            (slideInHorizontally(tweenOffset) { it / 2 } + fadeIn(tweenSpec)) togetherWith
                    (slideOutHorizontally(tweenOffset) { -it / 2 } + fadeOut(tweenSpec))
        }
        else -> {
            (slideInHorizontally(tweenOffset) { -it / 2 } + fadeIn(tweenSpec)) togetherWith
                    (slideOutHorizontally(tweenOffset) { it / 2 } + fadeOut(tweenSpec))
        }
    }

    return transition.using(SizeTransform(clip = false))
}