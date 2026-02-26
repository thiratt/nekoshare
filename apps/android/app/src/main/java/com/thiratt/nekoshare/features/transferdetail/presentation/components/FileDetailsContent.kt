package com.thiratt.nekoshare.features.transferdetail.presentation.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.Folder
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Storage
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import java.io.File
import java.util.Locale

@Composable
fun FileDetailsContent(file: File) {
    val extensionLabel = file.extension
        .takeIf { it.isNotBlank() }
        ?.uppercase(Locale.ROOT)
        ?: "UNKNOWN"

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(top = 16.dp)
    ) {
        Text(
            text = "รายละเอียด",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(24.dp))

        DetailRow(
            icon = Icons.Rounded.Description,
            label = "ชื่อไฟล์",
            value = file.name
        )
        DetailRow(
            icon = Icons.Rounded.Folder,
            label = "ตำแหน่ง",
            value = file.parent ?: "ไม่ทราบ"
        )
        DetailRow(
            icon = Icons.Rounded.Info,
            label = "ประเภท",
            value = extensionLabel
        )
        DetailRow(
            icon = Icons.Rounded.Storage,
            label = "ขนาด",
            value = formatTransferSize(file.length())
        )
    }
}

@Composable
private fun DetailRow(
    icon: ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.width(16.dp))

        Column {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun FileDetailsContentPreview() {
    NekoShareTheme {
        FileDetailsContent(
            file = File("Project_Summary_2026.pdf")
        )
    }
}
