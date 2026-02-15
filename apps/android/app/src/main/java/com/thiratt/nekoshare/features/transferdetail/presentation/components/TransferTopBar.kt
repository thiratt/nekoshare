package com.thiratt.nekoshare.features.transferdetail.presentation.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.automirrored.rounded.ViewList
import androidx.compose.material.icons.rounded.CheckCircleOutline
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.DeleteForever
import androidx.compose.material.icons.rounded.GridOn
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.components.NekoDropdownMenu
import com.thiratt.nekoshare.core.designsystem.components.NekoDropdownMenuItem
import com.thiratt.nekoshare.features.transferdetail.model.LayoutMode

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransferTopBar(
    fileName: String,
    senderName: String,
    isImage: Boolean,
    layoutMode: LayoutMode,
    onToggleLayout: () -> Unit,
    onBack: () -> Unit,
    onDelete: () -> Unit,
    onShowDetails: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showMenu by remember { mutableStateOf(false) }

    TopAppBar(
        modifier = modifier,
        title = {
            Column {
                val titleText = if (layoutMode == LayoutMode.Grid) "All Files" else fileName
                Text(
                    text = titleText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = "From $senderName",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        navigationIcon = {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back")
            }
        },
        actions = {
            IconButton(onClick = onToggleLayout) {
                val icon = if (layoutMode == LayoutMode.Grid) {
                    Icons.AutoMirrored.Rounded.ViewList
                } else {
                    Icons.Rounded.GridOn
                }
                Icon(icon, "Toggle Layout")
            }

            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(Icons.Rounded.MoreVert, "Options")
                }

                NekoDropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false }
                ) {
                    if (layoutMode == LayoutMode.Preview) {
                        if (isImage) {
                            NekoDropdownMenuItem(
                                text = "Copy Photo",
                                icon = Icons.Rounded.ContentCopy,
                                onClick = { /* Copy Logic */ showMenu = false }
                            )
                        }
                        NekoDropdownMenuItem(
                            text = "Open with",
                            icon = Icons.AutoMirrored.Rounded.OpenInNew,
                            onClick = { /* Open Logic */ showMenu = false }
                        )
                        NekoDropdownMenuItem(
                            text = "Share",
                            icon = Icons.Rounded.Share,
                            onClick = { /* Share Logic */ showMenu = false }
                        )
                        NekoDropdownMenuItem(
                            text = "Details",
                            icon = Icons.Rounded.Info,
                            onClick = { showMenu = false; onShowDetails() }
                        )
                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 4.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                        )
                        NekoDropdownMenuItem(
                            text = "Delete File",
                            icon = Icons.Rounded.Delete,
                            onClick = { showMenu = false; onDelete() },
                            isDestructive = true
                        )

                    } else {
                        NekoDropdownMenuItem(
                            text = "Select",
                            icon = Icons.Rounded.CheckCircleOutline,
                            onClick = {
                                showMenu = false
                                // TODO: Toggle Selection Mode
                            }
                        )

                        NekoDropdownMenuItem(
                            text = "Share All",
                            icon = Icons.Rounded.Share,
                            onClick = {
                                showMenu = false
                                // TODO: Share all files logic
                            }
                        )

                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 4.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                        )

                        NekoDropdownMenuItem(
                            text = "Delete Transfer",
                            icon = Icons.Rounded.DeleteForever,
                            onClick = {
                                showMenu = false
                                // TODO: Delete entire transfer logic
                            },
                            isDestructive = true
                        )
                    }
                }
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
    )
}