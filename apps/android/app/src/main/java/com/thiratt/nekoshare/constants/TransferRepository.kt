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
        ),
        TransferHistoryItem(
            id = "5",
            senderName = "Chanon",
            targetType = TargetType.Friend,
            files = listOf(
                ReceivedFileDetail("App_Icon_Concepts.zip", FileType.Archive),
                ReceivedFileDetail("UI_Mockup.png", FileType.Image)
            )
        ),
        TransferHistoryItem(
            id = "6",
            senderName = "Arch Linux PC",
            targetType = TargetType.Device,
            files = listOf(
                ReceivedFileDetail("nginx.conf", FileType.Document),
                ReceivedFileDetail("docker-compose.yml", FileType.Document)
            )
        ),
        TransferHistoryItem(
            id = "7",
            senderName = "Kenneth",
            targetType = TargetType.Friend,
            files = listOf(
                ReceivedFileDetail("Notes.pdf", FileType.Document),
                ReceivedFileDetail("Midterm_Scores.csv", FileType.Document)
            )
        ),
        TransferHistoryItem(
            id = "8",
            senderName = "EndeavourOS Laptop",
            targetType = TargetType.Device,
            files = listOf(
                ReceivedFileDetail("hashcat_wordlist.txt", FileType.Document),
                ReceivedFileDetail("cert.pem", FileType.Document)
            )
        ),
        TransferHistoryItem(
            id = "9",
            senderName = "Sarah",
            targetType = TargetType.Friend,
            files = listOf(
                ReceivedFileDetail("2D_Transformations_Homework.pdf", FileType.Document),
                ReceivedFileDetail("Scaling_Matrix.png", FileType.Image)
            )
        ),
        TransferHistoryItem(
            id = "10",
            senderName = "Mike",
            targetType = TargetType.Friend,
            files = listOf(
                ReceivedFileDetail("qam.pptx", FileType.Document),
                ReceivedFileDetail("constellation.png", FileType.Image)
            )
        ),
        TransferHistoryItem(
            id = "11",
            senderName = "Web Server",
            targetType = TargetType.Device,
            files = listOf(
                ReceivedFileDetail("server.ts", FileType.Document),
                ReceivedFileDetail("react_components.zip", FileType.Archive)
            )
        ),
        TransferHistoryItem(
            id = "12",
            senderName = "Windows Desktop",
            targetType = TargetType.Device,
            files = listOf(
                ReceivedFileDetail("config.json", FileType.Document),
                ReceivedFileDetail("test.py", FileType.Document)
            )
        ),
        TransferHistoryItem(
            id = "13",
            senderName = "Admin",
            targetType = TargetType.Friend,
            files = listOf(
                ReceivedFileDetail("Perceptron_Weights.csv", FileType.Document),
                ReceivedFileDetail("Training.mp4", FileType.Video)
            )
        ),
        TransferHistoryItem(
            id = "14",
            senderName = "Test User",
            targetType = TargetType.Friend,
            files = listOf(
                ReceivedFileDetail("build.apk", FileType.Archive),
                ReceivedFileDetail("debug_log.txt", FileType.Document)
            )
        )
    )

    fun getTransferById(id: String): TransferHistoryItem? {
        return mockTransfers.find { it.id == id }
    }
}