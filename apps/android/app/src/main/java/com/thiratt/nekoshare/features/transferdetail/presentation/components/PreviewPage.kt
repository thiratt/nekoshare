package com.thiratt.nekoshare.features.transferdetail.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.InsertDriveFile
import androidx.compose.material.icons.rounded.AudioFile
import androidx.compose.material.icons.rounded.Image
import androidx.compose.material.icons.rounded.PictureAsPdf
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import com.thiratt.nekoshare.features.transferdetail.model.FileType
import com.thiratt.nekoshare.features.transferdetail.model.getFileType
import java.io.File

@Composable
fun FilePreviewPage(file: File) {
    val fileType = remember(file) { getFileType(file) }
    val mockImageUrl = "https://github.com/thiratt.png"

    Box(
        modifier = Modifier
            .fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        if (fileType == FileType.Image) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(mockImageUrl)
                    .crossfade(true)
                    .build(),
                contentDescription = "ตัวอย่าง",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit
            )
        } else {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .background(
                            MaterialTheme.colorScheme.surfaceContainerHighest,
                            RoundedCornerShape(24.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        getFileIcon(file),
                        null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
                Spacer(modifier = Modifier.height(24.dp))
                Text("ไม่สามารถแสดงตัวอย่างได้", style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}

fun getFileIcon(file: File): ImageVector {
    return when (file.extension.lowercase()) {
        "jpg", "png" -> Icons.Rounded.Image
        "pdf" -> Icons.Rounded.PictureAsPdf
        "mp3" -> Icons.Rounded.AudioFile
        else -> Icons.AutoMirrored.Rounded.InsertDriveFile
    }
}