package com.thiratt.nekoshare.features.transferdetail.model

import com.thiratt.nekoshare.features.home.model.TransferDirection as HomeTransferDirection
import com.thiratt.nekoshare.features.home.model.TransferHistoryItem
import com.thiratt.nekoshare.features.home.model.TransferStatus as HomeTransferStatus
import java.io.File

fun HomeTransferStatus.toDetailStatus(): TransferStatus {
    return when (this) {
        HomeTransferStatus.Success -> TransferStatus.Success
        HomeTransferStatus.Failed -> TransferStatus.Failed
        HomeTransferStatus.Transferring -> TransferStatus.Transferring
    }
}

fun HomeTransferDirection.toDetailDirection(
    status: HomeTransferStatus
): TransferDirection {
    if (status == HomeTransferStatus.Transferring) {
        return TransferDirection.Sending
    }
    return when (this) {
        HomeTransferDirection.Incoming -> TransferDirection.Receiving
        HomeTransferDirection.Outgoing -> TransferDirection.Sending
    }
}

fun TransferHistoryItem.toDetailItem(): TransferItem {
    val detailStatus = status.toDetailStatus()
    return TransferItem(
        id = id,
        files = files.map { file -> File(file.name) },
        senderName = senderName,
        status = detailStatus,
        direction = direction.toDetailDirection(status)
    )
}
