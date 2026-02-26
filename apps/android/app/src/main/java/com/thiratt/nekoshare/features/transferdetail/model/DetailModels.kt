package com.thiratt.nekoshare.features.transferdetail.model

import java.io.File
import java.util.Locale

enum class TransferStatus {
    Transferring,
    Success,
    Failed
}

enum class TransferDirection {
    Sending,
    Receiving
}

enum class LayoutMode {
    Preview,
    Grid
}

data class TransferItem(
    val id: String,
    val files: List<File>,
    val senderName: String = "Alice",
    val status: TransferStatus,
    val direction: TransferDirection = TransferDirection.Receiving,
    val progress: Float = 0f
)

sealed interface TransferDetailNavEvent {
    data object Back : TransferDetailNavEvent
    data object Delete : TransferDetailNavEvent
}

enum class FileType {
    Image,
    Video,
    Audio,
    Document,
    Archive,
    Unknown
}

private val imageExtensions = setOf("jpg", "jpeg", "png", "gif", "webp", "bmp", "heic")
private val videoExtensions = setOf("mp4", "mov", "mkv", "avi", "webm", "m4v")
private val audioExtensions = setOf("mp3", "wav", "aac", "ogg", "m4a", "flac")
private val documentExtensions = setOf(
    "pdf",
    "txt",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "csv",
    "ppt",
    "pptx",
    "json",
    "xml",
    "yml",
    "yaml",
    "md",
    "kt",
    "java"
)
private val archiveExtensions = setOf("zip", "rar", "7z", "tar", "gz")

fun getFileType(file: File): FileType {
    val extension = file.extension.lowercase(Locale.ROOT)
    return when {
        extension in imageExtensions -> FileType.Image
        extension in videoExtensions -> FileType.Video
        extension in audioExtensions -> FileType.Audio
        extension in documentExtensions -> FileType.Document
        extension in archiveExtensions -> FileType.Archive
        else -> FileType.Unknown
    }
}
