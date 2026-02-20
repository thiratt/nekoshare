package com.thiratt.nekoshare.features.home.presentation.tabs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.constants.TransferRepository
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.home.model.TransferHistoryItem
import com.thiratt.nekoshare.features.home.presentation.components.FileDetailSheet
import com.thiratt.nekoshare.features.home.presentation.components.TransferHistoryCard
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeContent(
    onTransferItemClick: (String) -> Unit,
    contentPadding: Dp = 0.dp
) {
    var selectedItem by remember { mutableStateOf<TransferHistoryItem?>(null) }

    val sheetState = rememberModalBottomSheetState()
    val scope = rememberCoroutineScope()

    val transferHistoryList = remember { TransferRepository.mockTransfers }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 8.dp)
        ) {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 160.dp),
                contentPadding = PaddingValues(
                    start = 20.dp,
                    end = 20.dp,
                    bottom = contentPadding + 100.dp
                ),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(transferHistoryList) { item ->
                    TransferHistoryCard(
                        item = item,
                        onClick = { onTransferItemClick(item.id) },
                        onMoreClick = { selectedItem = item }
                    )
                }
            }
        }

        if (selectedItem != null) {
            FileDetailSheet(
                item = selectedItem!!,
                sheetState = sheetState,
                onDismissRequest = {
                    scope.launch { sheetState.hide() }.invokeOnCompletion { selectedItem = null }
                },
                onView = {
                    scope.launch { sheetState.hide() }.invokeOnCompletion {
                        val id = selectedItem!!.id
                        selectedItem = null
                        onTransferItemClick(id)
                    }
                }
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun HomeContentPreview() {
    NekoShareTheme {
        HomeContent(
            onTransferItemClick = {}
        )
    }
}