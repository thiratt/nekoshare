package com.thiratt.nekoshare.features.transferdetail.presentation.components

import androidx.activity.compose.BackHandler
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.thiratt.nekoshare.core.designsystem.components.NekoModalBottomSheet
import com.thiratt.nekoshare.core.designsystem.components.rememberNekoBottomSheetState
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.transferdetail.model.FileType
import com.thiratt.nekoshare.features.transferdetail.model.LayoutMode
import com.thiratt.nekoshare.features.transferdetail.model.TransferDirection
import com.thiratt.nekoshare.features.transferdetail.model.TransferItem
import com.thiratt.nekoshare.features.transferdetail.model.TransferStatus
import com.thiratt.nekoshare.features.transferdetail.model.getFileType
import kotlinx.coroutines.launch
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReceiveSuccessState(
    item: TransferItem,
    initialLayoutMode: LayoutMode,
    onBack: () -> Unit,
    onDelete: () -> Unit
) {
    if (item.files.isEmpty()) {
        EmptyReceiveSuccessState(onBack = onBack)
        return
    }

    val pagerState = rememberPagerState(pageCount = { item.files.size })
    val scope = rememberCoroutineScope()
    val detailSheetState = rememberNekoBottomSheetState()

    var requestedPage by rememberSaveable { mutableStateOf<Int?>(null) }
    var layoutMode by rememberSaveable { mutableStateOf(initialLayoutMode) }
    var showDetailSheet by rememberSaveable { mutableStateOf(false) }

    val currentPageIndex = (requestedPage ?: pagerState.currentPage).coerceIn(0, item.files.lastIndex)
    val currentFile = item.files[currentPageIndex]
    val isImage = remember(currentFile) { getFileType(currentFile) == FileType.Image }

    fun resetLayout() {
        layoutMode = initialLayoutMode
        requestedPage = null
    }

    val handleBack = {
        if (layoutMode != initialLayoutMode) {
            resetLayout()
        } else {
            onBack()
        }
    }

    BackHandler(enabled = layoutMode != initialLayoutMode) {
        resetLayout()
    }

    Scaffold(
        topBar = {
            ReceivedSuccessTopBar(
                fileName = currentFile.name,
                senderName = item.senderName,
                isImage = isImage,
                layoutMode = layoutMode,
                onToggleLayout = {
                    layoutMode = if (layoutMode == LayoutMode.Preview) {
                        LayoutMode.Grid
                    } else {
                        LayoutMode.Preview
                    }
                    if (layoutMode == LayoutMode.Grid) {
                        requestedPage = null
                    }
                },
                onBack = handleBack,
                onDelete = onDelete,
                onShowDetails = { showDetailSheet = true }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Crossfade(
                targetState = layoutMode,
                label = "ReceiveSuccessLayout"
            ) { mode ->
                when (mode) {
                    LayoutMode.Preview -> {
                        HorizontalPager(
                            state = pagerState,
                            modifier = Modifier.fillMaxSize()
                        ) { page ->
                            FilePreviewPage(item.files[page])
                        }
                    }

                    LayoutMode.Grid -> {
                        FileGridPage(
                            files = item.files,
                            onItemClick = { index ->
                                requestedPage = index
                                layoutMode = LayoutMode.Preview

                                scope.launch {
                                    pagerState.scrollToPage(index)
                                    requestedPage = null
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    if (showDetailSheet) {
        NekoModalBottomSheet(
            sheetState = detailSheetState,
            onDismissRequest = { showDetailSheet = false }
        ) {
            FileDetailsContent(file = currentFile)
        }
    }
}

@Composable
private fun EmptyReceiveSuccessState(
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            ReceivedSuccessTopBar(
                fileName = "ไม่มีไฟล์",
                senderName = "-",
                isImage = false,
                layoutMode = LayoutMode.Preview,
                onToggleLayout = {},
                onBack = onBack,
                onDelete = {},
                onShowDetails = {}
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "ไม่พบไฟล์",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ReceiveSuccessStatePreview() {
    NekoShareTheme {
        ReceiveSuccessState(
            item = TransferItem(
                id = "receive-success-preview",
                files = listOf(
                    File("IMG_2026_0001.jpg"),
                    File("transfer-note.txt"),
                    File("project-assets.zip")
                ),
                senderName = "Alice",
                status = TransferStatus.Success,
                direction = TransferDirection.Receiving
            ),
            initialLayoutMode = LayoutMode.Preview,
            onBack = {},
            onDelete = {}
        )
    }
}
