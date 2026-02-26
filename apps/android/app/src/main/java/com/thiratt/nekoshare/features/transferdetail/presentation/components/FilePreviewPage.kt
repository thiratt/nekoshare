package com.thiratt.nekoshare.features.transferdetail.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.transferdetail.model.FileType
import com.thiratt.nekoshare.features.transferdetail.model.getFileType
import java.io.File

@Composable
fun FilePreviewPage(file: File) {
    val fileType = remember(file) { getFileType(file) }

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        if (fileType == FileType.Image) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(MOCK_PREVIEW_IMAGE_URL)
                    .crossfade(true)
                    .build(),
                contentDescription = "ตัวอย่างไฟล์",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit
            )
        } else {
            UnsupportedPreviewCard(file = file)
        }
    }
}

@Composable
private fun UnsupportedPreviewCard(file: File) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(120.dp)
                .background(
                    color = MaterialTheme.colorScheme.surfaceContainerHighest,
                    shape = RoundedCornerShape(24.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = getFileIcon(file),
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.primary
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "ไม่สามารถแสดงตัวอย่างได้",
            style = MaterialTheme.typography.titleMedium
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun FilePreviewPageImagePreview() {
    NekoShareTheme {
        FilePreviewPage(
            file = File("IMG_2026_0001.jpg")
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun FilePreviewPageDocumentPreview() {
    NekoShareTheme {
        FilePreviewPage(
            file = File("meeting-notes.pdf")
        )
    }
}
