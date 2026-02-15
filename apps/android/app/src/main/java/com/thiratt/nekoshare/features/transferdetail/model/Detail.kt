package com.thiratt.nekoshare.features.transferdetail.model

import java.io.File

enum class TransferStatus { Transferring, Completed, Failed }
enum class LayoutMode { Preview, Grid }

data class TransferItem(
    val id: String,
    val files: List<File>,
    val senderName: String = "Alice",
    val status: TransferStatus,
    val progress: Float = 0f
)

sealed interface TransferDetailNavEvent {
    data object Back : TransferDetailNavEvent
    data object Delete : TransferDetailNavEvent
}

enum class FileType { Image, Video, Audio, Document, Archive, Unknown }

fun getFileType(file: File): FileType {
    return when (file.extension.lowercase()) {
        "jpg", "jpeg", "png", "gif", "webp" -> FileType.Image
        else -> FileType.Unknown
    }
}