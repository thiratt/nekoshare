package com.thiratt.nekoshare.features.transferdetail.presentation

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.transferdetail.model.LayoutMode
import com.thiratt.nekoshare.features.transferdetail.model.TransferDetailNavEvent
import com.thiratt.nekoshare.features.transferdetail.model.TransferItem
import com.thiratt.nekoshare.features.transferdetail.model.TransferStatus
import com.thiratt.nekoshare.features.transferdetail.presentation.components.CompletedState
import com.thiratt.nekoshare.features.transferdetail.presentation.components.TransferringState
import java.io.File

@Composable
fun TransferDetailRoute(
    item: TransferItem,
    initialLayoutMode: LayoutMode,
    onNavigate: (TransferDetailNavEvent) -> Unit
) {
    TransferDetailScreen(
        item = item,
        initialLayoutMode = initialLayoutMode,
        onBack = { onNavigate(TransferDetailNavEvent.Back) },
        onDelete = { onNavigate(TransferDetailNavEvent.Delete) }
    )
}

@Composable
fun TransferDetailScreen(
    item: TransferItem,
    initialLayoutMode: LayoutMode = LayoutMode.Preview,
    onBack: () -> Unit,
    onDelete: () -> Unit
) {
    if (item.status == TransferStatus.Transferring) {
        TransferringState(item = item, onBack = onBack)
    } else {
        CompletedState(
            item = item,
            initialLayoutMode = initialLayoutMode,
            onBack = onBack,
            onDelete = onDelete
        )
    }
}

@Preview(showBackground = true)
@Composable
fun TransferDetailPreview() {
    val mockFiles = listOf(File("test.jpg"))

    val item = TransferItem("1", mockFiles, "Alice", TransferStatus.Completed)

    NekoShareTheme {
        TransferDetailScreen(
            item = item,
            onBack = {},
            onDelete = {}
        )
    }
}