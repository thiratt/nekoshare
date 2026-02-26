package com.thiratt.nekoshare.features.transferdetail.presentation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.tooling.preview.Preview
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.transferdetail.model.LayoutMode
import com.thiratt.nekoshare.features.transferdetail.model.TransferDetailNavEvent
import com.thiratt.nekoshare.features.transferdetail.model.TransferDirection
import com.thiratt.nekoshare.features.transferdetail.model.TransferItem
import com.thiratt.nekoshare.features.transferdetail.model.TransferStatus
import com.thiratt.nekoshare.features.transferdetail.presentation.components.ReceiveFailedState
import com.thiratt.nekoshare.features.transferdetail.presentation.components.ReceiveSuccessState
import com.thiratt.nekoshare.features.transferdetail.presentation.components.SendDetailContent
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
    val transferDirection = remember(item.id, item.status, item.direction) {
        if (item.status == TransferStatus.Transferring) {
            TransferDirection.Sending
        } else {
            item.direction
        }
    }

    if (transferDirection == TransferDirection.Sending) {
        SendDetailContent(
            item = item,
            initialStatus = item.status,
            onBack = onBack
        )
    } else {
        when (item.status) {
            TransferStatus.Success -> {
                ReceiveSuccessState(
                    item = item,
                    initialLayoutMode = initialLayoutMode,
                    onBack = onBack,
                    onDelete = onDelete
                )
            }
            TransferStatus.Failed -> {
                ReceiveFailedState(
                    item = item,
                    onBack = onBack
                )
            }

            TransferStatus.Transferring -> { }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun TransferDetailPreview() {
    val mockFiles = listOf(File("test.jpg"))
    val item = TransferItem(
        id = "1",
        files = mockFiles,
        senderName = "Alice",
        status = TransferStatus.Success
    )

    NekoShareTheme {
        TransferDetailScreen(
            item = item,
            onBack = {},
            onDelete = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun TransferDetailTransferringPreview() {
    val mockFiles = listOf(File("test.jpg"))
    val item = TransferItem(
        id = "1",
        files = mockFiles,
        senderName = "Alice",
        status = TransferStatus.Transferring
    )

    NekoShareTheme {
        TransferDetailScreen(
            item = item,
            onBack = {},
            onDelete = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun TransferDetailTransferFailedPreview() {
    val mockFiles = listOf(File("test.jpg"))
    val item = TransferItem(
        id = "1",
        files = mockFiles,
        senderName = "Alice",
        status = TransferStatus.Failed
    )

    NekoShareTheme {
        TransferDetailScreen(
            item = item,
            onBack = {},
            onDelete = {}
        )
    }
}
