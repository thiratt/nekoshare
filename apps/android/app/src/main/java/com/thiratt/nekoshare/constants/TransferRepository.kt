package com.thiratt.nekoshare.constants

import com.thiratt.nekoshare.features.home.model.FileType
import com.thiratt.nekoshare.features.home.model.ReceivedFileDetail
import com.thiratt.nekoshare.features.home.model.TargetType
import com.thiratt.nekoshare.features.home.model.TransferDirection
import com.thiratt.nekoshare.features.home.model.TransferHistoryItem
import com.thiratt.nekoshare.features.home.model.TransferStatus

object TransferRepository {
    val mockTransfers = listOf(
        TransferHistoryItem(
            id = "1",
            senderName = "Office NAS",
            targetType = TargetType.Device,
            direction = TransferDirection.Outgoing,
            status = TransferStatus.Transferring,
            files = listOf(
                ReceivedFileDetail("Q4_Report.xlsx", FileType.Document),
                ReceivedFileDetail("marketing_assets.zip", FileType.Archive)
            )
        ),
        TransferHistoryItem(
            id = "2",
            senderName = "Sarah",
            targetType = TargetType.Friend,
            direction = TransferDirection.Outgoing,
            status = TransferStatus.Success,
            files = listOf(
                ReceivedFileDetail("UI_Review_Notes.pdf", FileType.Document)
            )
        ),
        TransferHistoryItem(
            id = "3",
            senderName = "Mike",
            targetType = TargetType.Friend,
            direction = TransferDirection.Outgoing,
            status = TransferStatus.Failed,
            files = listOf(
                ReceivedFileDetail("raw_camera_dump.zip", FileType.Archive),
                ReceivedFileDetail("error-log.txt", FileType.Document)
            )
        ),
        TransferHistoryItem(
            id = "4",
            senderName = "Windows Laptop",
            targetType = TargetType.Device,
            direction = TransferDirection.Outgoing,
            status = TransferStatus.Success,
            files = listOf(
                ReceivedFileDetail("Build_Release.apk", FileType.Archive),
                ReceivedFileDetail("changelog.md", FileType.Document)
            )
        ),
        TransferHistoryItem(
            id = "5",
            senderName = "Kenneth",
            targetType = TargetType.Friend,
            direction = TransferDirection.Outgoing,
            status = TransferStatus.Transferring,
            files = listOf(
                ReceivedFileDetail("vacation_reel.mp4", FileType.Video)
            )
        ),

        TransferHistoryItem(
            id = "6",
            senderName = "Chanon",
            targetType = TargetType.Friend,
            direction = TransferDirection.Incoming,
            status = TransferStatus.Success,
            files = listOf(
                ReceivedFileDetail("Chapter_6.pdf", FileType.Document),
                ReceivedFileDetail("tcpdump_logs.zip", FileType.Archive)
            )
        ),
        TransferHistoryItem(
            id = "7",
            senderName = "Build Server",
            targetType = TargetType.Device,
            direction = TransferDirection.Incoming,
            status = TransferStatus.Failed,
            files = listOf(
                ReceivedFileDetail("nightly-debug.apk", FileType.Archive)
            )
        ),

        TransferHistoryItem(
            id = "8",
            senderName = "Sarah",
            targetType = TargetType.Friend,
            direction = TransferDirection.Incoming,
            status = TransferStatus.Success,
            files = listOf(
                ReceivedFileDetail("Holiday_Party.jpg", FileType.Image)
            )
        ),
        TransferHistoryItem(
            id = "9",
            senderName = "My Tablet",
            targetType = TargetType.Device,
            direction = TransferDirection.Outgoing,
            status = TransferStatus.Failed,
            files = listOf(
                ReceivedFileDetail("Slides_Final.pptx", FileType.Document),
                ReceivedFileDetail("demo_clip.mp4", FileType.Video)
            )
        ),
        TransferHistoryItem(
            id = "10",
            senderName = "Presentation PC",
            targetType = TargetType.Device,
            direction = TransferDirection.Outgoing,
            status = TransferStatus.Success,
            files = listOf(
                ReceivedFileDetail("meeting_notes.txt", FileType.Document),
                ReceivedFileDetail("diagram.png", FileType.Image),
                ReceivedFileDetail("demo_assets.zip", FileType.Archive)
            )
        )
    )

    fun getTransferById(id: String): TransferHistoryItem? {
        return mockTransfers.find { it.id == id }
    }
}
