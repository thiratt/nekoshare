package com.thiratt.nekoshare.features.home.presentation.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.TopAppBarScrollBehavior
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusManager
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeTopAppBar(
    isSearchActive: Boolean,
    searchQuery: String,
    title: String,
    focusRequester: FocusRequester,
    scrollBehavior: TopAppBarScrollBehavior,
    focusManager: FocusManager = LocalFocusManager.current,
    onSearchQueryChange: (String) -> Unit,
    onSearchActiveChange: (Boolean) -> Unit,
    onNotificationsClick: () -> Unit,
    onSettingsClick: () -> Unit
) {
    val rawFraction = scrollBehavior.state.collapsedFraction
    val collapsedFraction = if (rawFraction.isNaN()) 0f else rawFraction.coerceIn(0f, 1f)
    val bgColor = MaterialTheme.colorScheme.background

    val topAlpha = 0.88f - (0.06f * collapsedFraction)
    val midAlpha = 0.75f - (0.25f * collapsedFraction)
    val fadeStartPosition = 0.65f - (0.20f * collapsedFraction)

    val topBarBrush = Brush.verticalGradient(
        0.0f to bgColor.copy(alpha = topAlpha),
        fadeStartPosition to bgColor.copy(alpha = midAlpha),
        1.0f to Color.Transparent
    )
    val titleScale by animateFloatAsState(
        targetValue = if (isSearchActive) 0.9f else 1f,
        animationSpec = tween(durationMillis = 220),
        label = "TopBarTitleScale"
    )

    AnimatedContent(
        targetState = isSearchActive,
        transitionSpec = {
            if (targetState) {
                (slideInHorizontally(tween(300)) { it } + fadeIn(tween(300))) togetherWith
                        fadeOut(tween(300))
            } else {
                fadeIn(tween(300)) togetherWith
                        (slideOutHorizontally(tween(300)) { it } + fadeOut(tween(300)))
            }
        },
        label = "TopBarAnimation"
    ) { active ->
        if (active) {
            TopAppBar(
                modifier = Modifier.background(bgColor),
                title = {
                    BasicTextField(
                        value = searchQuery,
                        onValueChange = onSearchQueryChange,
                        modifier = Modifier
                            .fillMaxWidth()
                            .focusRequester(focusRequester),
                        textStyle = TextStyle(
                            color = MaterialTheme.colorScheme.onSurface,
                            fontSize = 18.sp
                        ),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                        decorationBox = { innerTextField ->
                            Box(contentAlignment = Alignment.CenterStart) {
                                if (searchQuery.isEmpty()) {
                                    Text(
                                        "ค้นหา...",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(
                                            alpha = 0.6f
                                        ),
                                        fontSize = 18.sp
                                    )
                                }
                                innerTextField()
                            }
                        }
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        onSearchActiveChange(false)
                    }) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, "ย้อนกลับ")
                    }
                },
                actions = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { onSearchQueryChange("") }) {
                            Icon(Icons.Rounded.Close, "ล้าง")
                        }
                    }
                },
                scrollBehavior = scrollBehavior,
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = bgColor,
                    scrolledContainerColor = bgColor
                )
            )
        } else {
            TopAppBar(
                modifier = Modifier.background(topBarBrush),
                title = {
                    Text(
                        text = title,
                        modifier = Modifier.graphicsLayer {
                            scaleX = titleScale
                            scaleY = titleScale
                        }
                    )
                },
                actions = {
                    IconButton(onClick = { onSearchActiveChange(true) }) {
                        Icon(Icons.Rounded.Search, "ค้นหา")
                    }
                    IconButton(onClick = onNotificationsClick) {
                        Icon(Icons.Rounded.Notifications, "การแจ้งเตือน")
                    }
                    IconButton(onClick = onSettingsClick) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.secondaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Person,
                                contentDescription = "โปรไฟล์",
                                tint = MaterialTheme.colorScheme.onSecondaryContainer,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                },
                scrollBehavior = scrollBehavior,
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent,
                    scrolledContainerColor = Color.Transparent,
                    titleContentColor = MaterialTheme.colorScheme.onBackground,
                    actionIconContentColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
            )
        }
    }
}

