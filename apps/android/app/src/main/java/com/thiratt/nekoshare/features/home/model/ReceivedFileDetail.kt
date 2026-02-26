package com.thiratt.nekoshare.features.home.model

enum class FileType { Image, Video, Audio, Document, Archive, Unknown }
enum class TargetType { Friend, Device }
enum class TransferStatus { Success, Failed, Transferring }
enum class TransferDirection { Incoming, Outgoing }

data class SelectedFile(
    val name: String,
    val size: String,
    val type: FileType
)

data class ReceivedFileDetail(
    val name: String,
    val type: FileType,
    val size: String = "2 MB"
)

data class TransferHistoryItem(
    val id: String,
    val senderName: String,
    val targetType: TargetType,
    val direction: TransferDirection = TransferDirection.Incoming,
    val status: TransferStatus = TransferStatus.Success,
    val timestamp: Long = System.currentTimeMillis(),
    val files: List<ReceivedFileDetail>
)
