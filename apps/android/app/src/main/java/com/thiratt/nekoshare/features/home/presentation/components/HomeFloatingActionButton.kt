package com.thiratt.nekoshare.features.home.presentation.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
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
        contentAlignment = Alignment.Center,
        modifier = modifier,
        transitionSpec = {
            val tweenSpec = tween<Float>(durationMillis = 300)
            val tweenOffset = tween<IntOffset>(durationMillis = 300)

            if (targetState == 2) {
                EnterTransition.None togetherWith
                        (slideOutVertically(tweenOffset) { height -> height } + fadeOut(tweenSpec))
            }
            else if (initialState == 2) {
                (slideInVertically(tweenOffset) { height -> height } + fadeIn(tweenSpec)) togetherWith
                        ExitTransition.None
            }
            else {
                if (targetState > initialState) {
                    (slideInHorizontally(tweenOffset) { it / 2 } + fadeIn(tweenSpec)) togetherWith
                            (slideOutHorizontally(tweenOffset) { -it / 2 } + fadeOut(tweenSpec))
                } else {
                    (slideInHorizontally(tweenOffset) { -it / 2 } + fadeIn(tweenSpec)) togetherWith
                            (slideOutHorizontally(tweenOffset) { it / 2 } + fadeOut(tweenSpec))
                }
            }
        },
        label = "FabAnimation"
    ) { index ->
        if (index == 2) {
            Spacer(Modifier.size(56.dp))
        } else {
            val isFriendsTab = index == 1
            ExtendedFloatingActionButton(
                text = { Text(if (isFriendsTab) "เพิ่มเพื่อน" else "แชร์") },
                onClick = {
                    if (isFriendsTab) onAddFriends() else onShareClick()
                },
                icon = {
                    Icon(
                        if (isFriendsTab) Icons.Rounded.PersonAdd else Icons.Outlined.Share,
                        null
                    )
                },
                expanded = true
            )
        }
    }
}