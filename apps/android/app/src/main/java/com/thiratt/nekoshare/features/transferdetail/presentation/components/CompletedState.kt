package com.thiratt.nekoshare.features.transferdetail.presentation.components

import androidx.activity.compose.BackHandler
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.thiratt.nekoshare.core.designsystem.components.NekoModalBottomSheet
import com.thiratt.nekoshare.features.transferdetail.model.FileType
import com.thiratt.nekoshare.features.transferdetail.model.LayoutMode
import com.thiratt.nekoshare.features.transferdetail.model.TransferItem
import com.thiratt.nekoshare.features.transferdetail.model.getFileType
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompletedState(
    item: TransferItem,
    initialLayoutMode: LayoutMode,
    onBack: () -> Unit,
    onDelete: () -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { item.files.size })

    var targetPage by remember { mutableStateOf<Int?>(null) }
    val currentFile = item.files[targetPage ?: pagerState.currentPage]
    val fileType = remember(currentFile) { getFileType(currentFile) }
    var layoutMode by remember { mutableStateOf(initialLayoutMode) }

    val handleBackLogic = {
        if (layoutMode != initialLayoutMode) {
            layoutMode = initialLayoutMode
            targetPage = null
        } else {
            onBack()
        }
    }

    BackHandler(enabled = layoutMode != initialLayoutMode) {
        layoutMode = initialLayoutMode
        targetPage = null
    }

    var showDetailSheet by remember { mutableStateOf(false) }
    val detailSheetState = rememberModalBottomSheetState()
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TransferTopBar(
                fileName = currentFile.name,
                senderName = item.senderName,
                isImage = fileType == FileType.Image,
                layoutMode = layoutMode,
                onToggleLayout = {
                    layoutMode =
                        if (layoutMode == LayoutMode.Preview) LayoutMode.Grid else LayoutMode.Preview
                    if (layoutMode == LayoutMode.Grid) targetPage = null
                },
                onBack = handleBackLogic,
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
            Crossfade(targetState = layoutMode, label = "LayoutFade") { mode ->
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
                        GridPage(
                            files = item.files,
                            onItemClick = { index ->
                                targetPage = index
                                layoutMode = LayoutMode.Preview

                                scope.launch {
                                    pagerState.scrollToPage(index)
                                    targetPage = null
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
            onDismissRequest = { showDetailSheet = false },
        ) {
            FileDetailsContent(file = currentFile)
        }
    }
}