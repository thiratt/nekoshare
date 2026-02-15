package com.thiratt.nekoshare.constants

import com.thiratt.nekoshare.features.home.model.FileType
import com.thiratt.nekoshare.features.home.model.ReceivedFileDetail
import com.thiratt.nekoshare.features.home.model.TargetType
import com.thiratt.nekoshare.features.home.model.TransferHistoryItem

object TransferRepository {
    val mockTransfers = listOf(
        TransferHistoryItem(
            id = "1",
            senderName = "Kenneth",
            targetType = TargetType.Friend,
            files = listOf(
                ReceivedFileDetail("Chapter 6.pdf", FileType.Document),
                ReceivedFileDetail("TCPView.zip", FileType.Archive),
                ReceivedFileDetail("Holiday.jpg", FileType.Image),
                ReceivedFileDetail("Meeting.mp3", FileType.Audio),
                ReceivedFileDetail("Project_Specs.docx", FileType.Document)
            )
        ),
        TransferHistoryItem(
            id = "2",
            senderName = "Sarah",
            targetType = TargetType.Friend,
            files = listOf(
                ReceivedFileDetail("Holiday_Party.jpg", FileType.Image)
            )
        ),
        TransferHistoryItem(
            id = "3",
            senderName = "My PC",
            targetType = TargetType.Device,
            files = listOf(
                ReceivedFileDetail("Backup.zip", FileType.Archive),
                ReceivedFileDetail("Notes.txt", FileType.Document)
            )
        ),
        TransferHistoryItem(
            id = "4",
            senderName = "iPad Air",
            targetType = TargetType.Device,
            files = listOf(
                ReceivedFileDetail("Demo_Clip.mp4", FileType.Video)
            )
        )
    )

    fun getTransferById(id: String): TransferHistoryItem? {
        return mockTransfers.find { it.id == id }
    }
}