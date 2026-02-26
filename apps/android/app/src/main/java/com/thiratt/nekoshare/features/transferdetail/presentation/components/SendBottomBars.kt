package com.thiratt.nekoshare.features.transferdetail.presentation.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.shrinkHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.GenericShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.transferdetail.model.TransferStatus

@Composable
internal fun SendDetailBottomBar(
    status: TransferStatus,
    progress: Float,
    sentFiles: Int,
    totalFiles: Int,
    sentSizeStr: String,
    totalSizeStr: String,
    isPaused: Boolean,
    onPauseResumeClick: () -> Unit,
    onCancelClick: () -> Unit,
    onRetryClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val clampedProgress = progress.coerceIn(0f, 1f)
    val isTransferring = status == TransferStatus.Transferring
    val isFailed = status == TransferStatus.Failed

    val titleText = when {
        status == TransferStatus.Success -> "ส่งแล้ว"
        isFailed -> "ล้มเหลว $sentFiles/$totalFiles"
        isPaused -> "หยุดชั่วคราว $sentFiles/$totalFiles"
        else -> "กำลังส่ง $sentFiles/$totalFiles"
    }

    val subtitleText = if (isFailed) {
        totalSizeStr
    } else {
        "$sentSizeStr / $totalSizeStr"
    }

    val trailingText = if (isFailed) {
        "ลองอีกครั้ง"
    } else {
        "${(clampedProgress * 100).toInt()}%"
    }

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
        Row(
            modifier = Modifier
                .padding(horizontal = 18.dp)
                .padding(bottom = 12.dp)
                .navigationBarsPadding()
                .widthIn(max = 400.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            SendProgressPill(
                titleText = titleText,
                subtitleText = subtitleText,
                trailingText = trailingText,
                progress = if (isFailed) 0f else clampedProgress,
                useProgressOverlay = !isFailed,
                modifier = Modifier.weight(1f)
            )

            AnimatedVisibility(
                visible = isTransferring,
                enter = fadeIn() + scaleIn(initialScale = 0.6f) + expandHorizontally(expandFrom = Alignment.End),
                exit = fadeOut() + scaleOut(targetScale = 0.6f) + shrinkHorizontally(shrinkTowards = Alignment.End)
            ) {
                Box(modifier = Modifier.padding(start = 8.dp)) {
                    IconButton(
                        onClick = onPauseResumeClick,
                        modifier = Modifier
                            .size(60.dp)
                            .shadow(2.dp, CircleShape)
                            .background(MaterialTheme.colorScheme.secondaryContainer, CircleShape)
                    ) {
                        AnimatedContent(
                            targetState = isPaused,
                            transitionSpec = {
                                (fadeIn() + scaleIn(initialScale = 0.6f)) togetherWith
                                        (fadeOut() + scaleOut(targetScale = 0.6f))
                            },
                            label = "PauseIconTransition"
                        ) { paused ->
                            Icon(
                                imageVector = if (paused) Icons.Rounded.PlayArrow else Icons.Rounded.Pause,
                                contentDescription = if (paused) "ทำต่อการส่ง" else "หยุดการส่ง",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }

            AnimatedVisibility(
                visible = status != TransferStatus.Success,
                enter = fadeIn() + scaleIn(initialScale = 0.6f) + expandHorizontally(expandFrom = Alignment.End),
                exit = fadeOut() + scaleOut(targetScale = 0.6f) + shrinkHorizontally(shrinkTowards = Alignment.End)
            ) {
                Box(modifier = Modifier.padding(start = 8.dp)) {
                    if (isFailed) {
                        ActionCircleButton(
                            icon = Icons.Rounded.Refresh,
                            contentDescription = "ลองอีกครั้งทั้งหมด",
                            backgroundColor = MaterialTheme.colorScheme.primary,
                            iconTint = MaterialTheme.colorScheme.onPrimary,
                            onClick = onRetryClick
                        )
                    } else {
                        ActionCircleButton(
                            icon = Icons.Rounded.Close,
                            contentDescription = "ยกเลิกทั้งหมด",
                            backgroundColor = MaterialTheme.colorScheme.errorContainer,
                            iconTint = MaterialTheme.colorScheme.onErrorContainer,
                            onClick = onCancelClick
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SendProgressPill(
    titleText: String,
    subtitleText: String,
    trailingText: String,
    progress: Float,
    useProgressOverlay: Boolean,
    modifier: Modifier = Modifier
) {
    val normalizedProgress = progress.coerceIn(0f, 1f)
    val progressShape = GenericShape { size, _ ->
        addRect(Rect(0f, 0f, size.width * normalizedProgress, size.height))
    }

    Box(
        modifier = modifier
            .height(60.dp)
            .fillMaxHeight()
            .shadow(2.dp, CircleShape)
            .background(MaterialTheme.colorScheme.surfaceContainerHigh, CircleShape)
            .clip(CircleShape)
    ) {
        SendProgressContent(
            titleText = titleText,
            subtitleText = subtitleText,
            trailingText = trailingText,
            textColor = MaterialTheme.colorScheme.onSurface
        )

        if (useProgressOverlay) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(progressShape)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.primary)
                )

                SendProgressContent(
                    titleText = titleText,
                    subtitleText = subtitleText,
                    trailingText = trailingText,
                    textColor = MaterialTheme.colorScheme.onPrimary
                )
            }
        }
    }
}

@Composable
private fun ActionCircleButton(
    icon: ImageVector,
    contentDescription: String,
    backgroundColor: Color,
    iconTint: Color,
    onClick: () -> Unit
) {
    IconButton(
        onClick = onClick,
        modifier = Modifier
            .size(60.dp)
            .shadow(2.dp, CircleShape)
            .background(backgroundColor, CircleShape)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = iconTint
        )
    }
}

@Composable
private fun SendProgressContent(
    titleText: String,
    subtitleText: String,
    trailingText: String,
    textColor: Color
) {
    Row(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = titleText,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = textColor
            )
            Text(
                text = subtitleText,
                style = MaterialTheme.typography.labelSmall,
                color = textColor.copy(alpha = 0.8f)
            )
        }

        Text(
            text = trailingText,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.ExtraBold,
            color = textColor
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SendDetailBottomBarTransferringPreview() {
    NekoShareTheme {
        SendDetailBottomBar(
            status = TransferStatus.Transferring,
            progress = 0.42f,
            sentFiles = 2,
            totalFiles = 5,
            sentSizeStr = "420 MB",
            totalSizeStr = "1.2 GB",
            isPaused = false,
            onPauseResumeClick = {},
            onCancelClick = {},
            onRetryClick = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SendDetailBottomBarFailedPreview() {
    NekoShareTheme {
        SendDetailBottomBar(
            status = TransferStatus.Failed,
            progress = 0f,
            sentFiles = 1,
            totalFiles = 5,
            sentSizeStr = "0 B",
            totalSizeStr = "1.2 GB",
            isPaused = false,
            onPauseResumeClick = {},
            onCancelClick = {},
            onRetryClick = {}
        )
    }
}
