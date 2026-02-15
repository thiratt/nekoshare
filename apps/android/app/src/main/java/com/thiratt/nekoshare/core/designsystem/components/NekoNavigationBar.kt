package com.thiratt.nekoshare.core.designsystem.components

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ShortNavigationBar
import androidx.compose.material3.ShortNavigationBarItem
import androidx.compose.material3.ShortNavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.model.NekoNavigationBarItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NekoNavigationBar(
    items: List<NekoNavigationBarItem>,
    selectedItem: Int,
    onItemClick: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        HorizontalDivider(
            color = MaterialTheme.colorScheme.outlineVariant,
            thickness = 0.5.dp
        )
        ShortNavigationBar(
            containerColor = MaterialTheme.colorScheme.secondaryContainer,
        ) {
            items.forEachIndexed { index, item ->
                ShortNavigationBarItem(
                    selected = selectedItem == index,
                    onClick = { onItemClick(index) },
                    icon = { Icon(item.icon, contentDescription = item.name) },
                    label = { Text(item.name) },
                    colors = ShortNavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary,
                        selectedIndicatorColor = MaterialTheme.colorScheme.primaryContainer,
                        unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                )
            }
        }
    }
}