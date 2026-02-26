package com.thiratt.nekoshare.features.transferdetail.presentation.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.InsertDriveFile
import androidx.compose.material.icons.rounded.AudioFile
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.FolderZip
import androidx.compose.material.icons.rounded.Image
import androidx.compose.material.icons.rounded.VideoFile
import androidx.compose.ui.graphics.vector.ImageVector
import com.thiratt.nekoshare.features.transferdetail.model.FileType
import com.thiratt.nekoshare.features.transferdetail.model.getFileType
import java.io.File
import java.util.Locale

internal const val MOCK_PREVIEW_IMAGE_URL = "https://github.com/thiratt.png"
private const val MOCK_MIN_FILE_SIZE_MB = 10L
private const val MOCK_MAX_FILE_SIZE_MB = 150L

internal fun getFileIcon(file: File): ImageVector {
    return when (getFileType(file)) {
        FileType.Image -> Icons.Rounded.Image
        FileType.Video -> Icons.Rounded.VideoFile
        FileType.Audio -> Icons.Rounded.AudioFile
        FileType.Document -> Icons.Rounded.Description
        FileType.Archive -> Icons.Rounded.FolderZip
        FileType.Unknown -> Icons.AutoMirrored.Rounded.InsertDriveFile
    }
}

internal fun formatTransferSize(bytes: Long): String {
    val safeBytes = bytes.coerceAtLeast(0L)
    val kb = safeBytes / 1024.0
    val mb = kb / 1024.0
    val gb = mb / 1024.0
    return when {
        gb >= 1.0 -> String.format(Locale.US, "%.2f GB", gb)
        mb >= 1.0 -> String.format(Locale.US, "%.0f MB", mb)
        kb >= 1.0 -> String.format(Locale.US, "%.0f KB", kb)
        else -> "$safeBytes B"
    }
}

internal fun mockFileSizeBytes(file: File): Long {
    val range = (MOCK_MAX_FILE_SIZE_MB - MOCK_MIN_FILE_SIZE_MB + 1).toInt()
    val normalized = Math.floorMod(file.name.lowercase(Locale.ROOT).hashCode(), range)
    val megaBytes = MOCK_MIN_FILE_SIZE_MB + normalized
    return megaBytes * 1024L * 1024L
}
