package com.thiratt.nekoshare.features.transferdetail.presentation.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.transferdetail.model.TransferDirection
import com.thiratt.nekoshare.features.transferdetail.model.TransferItem
import com.thiratt.nekoshare.features.transferdetail.model.TransferStatus
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.File
import kotlin.math.max

private const val PROGRESS_TICK_DELAY_MS = 80L
private const val SUCCESS_HIDE_BOTTOM_BAR_DELAY_MS = 1000L
private const val PROGRESS_CHUNKS_PER_FILE = 40L

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SendDetailContent(
    item: TransferItem,
    initialStatus: TransferStatus,
    onBack: () -> Unit
) {
    val initiallySucceeded = initialStatus == TransferStatus.Success
    var status by remember(item.id) { mutableStateOf(initialStatus) }
    var isPaused by remember(item.id) { mutableStateOf(false) }
    var transferRunKey by remember(item.id) { mutableIntStateOf(0) }
    var showBottomBar by remember(item.id) { mutableStateOf(true) }

    val fileSizes = remember(item.files) {
        item.files.associateWith(::mockFileSizeBytes)
    }
    val totalBytes = remember(fileSizes) { fileSizes.values.sum() }

    var totalSentBytes by remember(item.id, item.files) {
        mutableLongStateOf(if (initiallySucceeded) totalBytes else 0L)
    }
    var overallProgress by remember(item.id, item.files) {
        mutableFloatStateOf(
            if (initiallySucceeded && totalBytes > 0L) {
                1f
            } else {
                0f
            }
        )
    }
    var completedFilesCount by remember(item.id, item.files) {
        mutableIntStateOf(if (initiallySucceeded) item.files.size else 0)
    }

    val fileProgresses = remember(item.id, item.files) {
        mutableStateMapOf<File, Float>().apply {
            item.files.forEach { file ->
                put(
                    file,
                    if (initiallySucceeded) {
                        1f
                    } else {
                        0f
                    }
                )
            }
        }
    }

    val sentBytesByFile = remember(item.id, item.files) {
        mutableStateMapOf<File, Long>().apply {
            item.files.forEach { file ->
                val fileSize = fileSizes[file] ?: 0L
                put(
                    file,
                    if (initiallySucceeded) {
                        fileSize
                    } else {
                        0L
                    }
                )
            }
        }
    }

    val completionByFile = remember(item.id, item.files) {
        mutableStateMapOf<File, Boolean>().apply {
            item.files.forEach { file ->
                put(file, initiallySucceeded)
            }
        }
    }

    fun setFileSentBytes(file: File, sentBytes: Long) {
        val fileSize = fileSizes[file] ?: 0L
        val clampedSentBytes = sentBytes.coerceIn(0L, fileSize)
        val previousSentBytes = sentBytesByFile[file] ?: 0L

        if (previousSentBytes != clampedSentBytes) {
            sentBytesByFile[file] = clampedSentBytes
            totalSentBytes = (totalSentBytes + (clampedSentBytes - previousSentBytes)).coerceIn(0L, totalBytes)
            overallProgress = if (totalBytes > 0L) {
                totalSentBytes.toFloat() / totalBytes
            } else {
                0f
            }
        }

        fileProgresses[file] = if (fileSize > 0L) {
            clampedSentBytes.toFloat() / fileSize
        } else {
            1f
        }

        val wasCompleted = completionByFile[file] ?: false
        val isCompleted = clampedSentBytes >= fileSize

        if (!wasCompleted && isCompleted) {
            completionByFile[file] = true
            completedFilesCount += 1
        } else if (wasCompleted && !isCompleted) {
            completionByFile[file] = false
            completedFilesCount = (completedFilesCount - 1).coerceAtLeast(0)
        }
    }

    fun resetAllProgress() {
        totalSentBytes = 0L
        overallProgress = 0f
        completedFilesCount = 0

        item.files.forEach { file ->
            sentBytesByFile[file] = 0L
            fileProgresses[file] = 0f
            completionByFile[file] = false
        }
    }

    fun retryTransfer() {
        status = TransferStatus.Transferring
        isPaused = false
        transferRunKey += 1
        resetAllProgress()
    }

    fun failTransferNow() {
        if (status != TransferStatus.Transferring) return
        status = TransferStatus.Failed
        isPaused = false
        transferRunKey += 1
    }

    LaunchedEffect(item.files, fileSizes, totalBytes, status, transferRunKey) {
        if (status != TransferStatus.Transferring) {
            return@LaunchedEffect
        }

        val currentRunKey = transferRunKey

        item.files.forEach { file ->
            if (completionByFile[file] == true) {
                return@forEach
            }

            launch {
                val fileSize = fileSizes[file] ?: 0L
                if (fileSize <= 0L || totalBytes <= 0L) {
                    setFileSentBytes(file, fileSize)
                    return@launch
                }

                var sentBytesForFile = sentBytesByFile[file] ?: 0L
                val chunkSize = max(fileSize / PROGRESS_CHUNKS_PER_FILE, 1L)

                while (isActive && sentBytesForFile < fileSize) {
                    if (status != TransferStatus.Transferring || currentRunKey != transferRunKey) {
                        return@launch
                    }

                    if (isPaused) {
                        delay(PROGRESS_TICK_DELAY_MS)
                        continue
                    }

                    delay(PROGRESS_TICK_DELAY_MS)

                    if (status != TransferStatus.Transferring || currentRunKey != transferRunKey || isPaused) {
                        continue
                    }

                    sentBytesForFile = (sentBytesForFile + chunkSize).coerceAtMost(fileSize)
                    setFileSentBytes(file, sentBytesForFile)
                }

                if (status == TransferStatus.Transferring && currentRunKey == transferRunKey) {
                    setFileSentBytes(file, fileSize)
                }
            }
        }
    }

    LaunchedEffect(overallProgress, status) {
        if (status == TransferStatus.Transferring && overallProgress >= 1f) {
            status = TransferStatus.Success
            isPaused = false
        }
    }

    LaunchedEffect(status) {
        if (status == TransferStatus.Success) {
            delay(SUCCESS_HIDE_BOTTOM_BAR_DELAY_MS)
            if (status == TransferStatus.Success) {
                showBottomBar = false
            }
        } else {
            showBottomBar = true
        }
    }

    val targetName = item.senderName.takeIf { it.isNotBlank() } ?: "อุปกรณ์ปลายทาง"

    Scaffold(
        topBar = {
            when (status) {
                TransferStatus.Transferring -> SendTransferringTopBar(
                    fileCount = item.files.size,
                    targetName = targetName,
                    isPaused = isPaused,
                    onBack = onBack
                )

                TransferStatus.Failed -> SendFailedTopBar(
                    fileCount = item.files.size,
                    targetName = targetName,
                    onBack = onBack
                )

                TransferStatus.Success -> SendSuccessTopBar(
                    fileCount = item.files.size,
                    targetName = targetName,
                    onBack = onBack
                )
            }
        },
        contentWindowInsets = WindowInsets(0)
    ) { padding ->
        Box(
            modifier = Modifier.fillMaxSize()
        ) {
            LazyColumn(
                modifier = Modifier
                    .padding(top = padding.calculateTopPadding())
                    .fillMaxSize(),
                contentPadding = PaddingValues(
                    start = 16.dp,
                    end = 16.dp,
                    top = 20.dp,
                    bottom = 120.dp
                ),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(item.files, key = { it.path }) { file ->
                    val fileProgress = fileProgresses[file] ?: 0f
                    val fileBytes = fileSizes[file] ?: 0L

                    if (status == TransferStatus.Failed && fileProgress < 1f) {
                        SendFailedFileItem(
                            file = file,
                            fileSizeBytes = fileBytes,
                            onRetryClick = { retryTransfer() }
                        )
                    } else {
                        SendingFileItem(
                            file = file,
                            progress = fileProgress,
                            fileSizeBytes = fileBytes,
                            onCancelClick = if (status == TransferStatus.Transferring) {
                                { failTransferNow() }
                            } else {
                                null
                            }
                        )
                    }
                }
            }

            AnimatedVisibility(
                visible = showBottomBar,
                enter = fadeIn(animationSpec = tween(300)) +
                        slideInVertically(
                            initialOffsetY = { it },
                            animationSpec = tween(300)
                        ) +
                        scaleIn(
                            initialScale = 0.9f,
                            transformOrigin = TransformOrigin(0.5f, 1f),
                            animationSpec = tween(300)
                        ),
                exit = fadeOut(animationSpec = tween(250)) +
                        slideOutVertically(
                            targetOffsetY = { it },
                            animationSpec = tween(250)
                        ) +
                        scaleOut(
                            targetScale = 0.9f,
                            transformOrigin = TransformOrigin(0.5f, 1f),
                            animationSpec = tween(250)
                        ),
                modifier = Modifier.align(Alignment.BottomCenter)
            ) {
                SendDetailBottomBar(
                    status = status,
                    progress = overallProgress,
                    sentFiles = completedFilesCount,
                    totalFiles = item.files.size,
                    sentSizeStr = formatTransferSize(totalSentBytes),
                    totalSizeStr = formatTransferSize(totalBytes),
                    isPaused = isPaused,
                    onPauseResumeClick = { isPaused = !isPaused },
                    onCancelClick = { failTransferNow() },
                    onRetryClick = { retryTransfer() }
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun SendDetailContentPreview() {
    NekoShareTheme {
        val mockFiles = listOf(
            File("Project_Presentation_Final.pdf"),
            File("vacation_photo_01.jpg"),
            File("NekoShare_SourceCode.zip")
        )

        val item = TransferItem(
            id = "preview",
            files = mockFiles,
            senderName = "My PC",
            status = TransferStatus.Transferring,
            direction = TransferDirection.Sending
        )

        SendDetailContent(
            item = item,
            initialStatus = TransferStatus.Transferring,
            onBack = {}
        )
    }
}
