package com.thiratt.nekoshare.features.home.presentation.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Android
import androidx.compose.material.icons.rounded.Computer
import androidx.compose.material.icons.rounded.DeleteForever
import androidx.compose.material.icons.rounded.Public
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberTopAppBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.thiratt.nekoshare.core.designsystem.components.rememberNekoBottomSheetState
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.home.model.DeviceItem
import com.thiratt.nekoshare.features.home.model.DeviceStatus
import com.thiratt.nekoshare.features.home.model.DeviceType
import com.thiratt.nekoshare.features.home.presentation.components.DeviceDetailSheet
import com.thiratt.nekoshare.features.home.presentation.components.HomeTopAppBar
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DevicesContent(
    isSearchActive: Boolean,
    searchQuery: String,
    focusRequester: FocusRequester,
    onSearchQueryChange: (String) -> Unit,
    onSearchActiveChange: (Boolean) -> Unit,
    onNotificationsClick: () -> Unit,
    onSettingsClick: () -> Unit
) {
    var selectedDevice by remember { mutableStateOf<DeviceItem?>(null) }
    val sheetState = rememberNekoBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val topBarState = rememberTopAppBarState()
    val scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior(
        state = topBarState,
        canScroll = {
            listState.canScrollForward || listState.canScrollBackward || topBarState.collapsedFraction > 0f
        }
    )

    val currentDevice = remember {
        DeviceItem(
            id = "1",
            name = "Xiaomi 15 Pro",
            appName = "NekoShare App",
            appVersion = "1.0.0",
            type = DeviceType.Android,
            status = DeviceStatus.Current,
            ipAddress = "192.168.1.45",
            location = "Bangkok, Thailand",
            lastSeen = "ออนไลน์"
        )
    }

    val otherDevices = remember {
        listOf(
            DeviceItem(
                "2",
                "Kenneth's PC",
                "NekoShare Desktop",
                "2.1.0",
                DeviceType.Windows,
                DeviceStatus.Online,
                "10.237.215.68",
                "Bangkok, Thailand",
                "ออนไลน์"
            ),
            DeviceItem(
                "3",
                "Chrome 142",
                "Chrome on Windows",
                "1.5.2",
                DeviceType.Website,
                DeviceStatus.Offline,
                "10.237.215.217",
                "Chiang Mai, Thailand",
                "เห็นล่าสุด 2 ชั่วโมงที่แล้ว"
            )
        )
    }

    val normalizedQuery = searchQuery.trim()
    val filteredOtherDevices = remember(otherDevices, normalizedQuery) {
        if (normalizedQuery.isBlank()) {
            otherDevices
        } else {
            otherDevices.filter { device ->
                device.matchesQuery(normalizedQuery)
            }
        }
    }
    val isCurrentDeviceMatched =
        normalizedQuery.isBlank() || currentDevice.matchesQuery(normalizedQuery)
    val hasSearchResults = isCurrentDeviceMatched || filteredOtherDevices.isNotEmpty()

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            HomeTopAppBar(
                isSearchActive = isSearchActive,
                searchQuery = searchQuery,
                title = "อุปกรณ์",
                focusRequester = focusRequester,
                scrollBehavior = scrollBehavior,
                onSearchQueryChange = onSearchQueryChange,
                onSearchActiveChange = onSearchActiveChange,
                onNotificationsClick = onNotificationsClick,
                onSettingsClick = onSettingsClick
            )
        },
        containerColor = Color.Transparent
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize()) {
            LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    top = innerPadding.calculateTopPadding(),
                )
            ) {
                if (isCurrentDeviceMatched) {
                    item {
                        SectionHeader("อุปกรณ์นี้")
                        DeviceListTile(
                            device = currentDevice,
                            onClick = { selectedDevice = currentDevice }
                        )
                        HorizontalDivider(
                            modifier = Modifier.padding(start = 72.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                        )
                    }
                }

                if (normalizedQuery.isBlank() && isCurrentDeviceMatched) {
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { /* Terminate Logic */ }
                                .padding(vertical = 12.dp, horizontal = 16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Rounded.DeleteForever,
                                null,
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(32.dp))
                            Text(
                                "ลบอุปกรณ์อื่นทั้งหมด",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.error,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(12.dp)
                                .background(MaterialTheme.colorScheme.secondaryContainer)
                        )
                    }
                }

                if (filteredOtherDevices.isNotEmpty()) {
                    item { SectionHeader("อุปกรณ์ที่ใช้งานอยู่") }
                }

                items(filteredOtherDevices) { device ->
                    DeviceListTile(
                        device = device,
                        onClick = { selectedDevice = device }
                    )
                    HorizontalDivider(
                        modifier = Modifier.padding(start = 72.dp),
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f)
                    )
                }

                if (!hasSearchResults) {
                    item {
                        Text(
                            text = "ไม่พบอุปกรณ์ที่ตรงกับ \"$searchQuery\"",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 24.dp)
                        )
                    }
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }

            if (selectedDevice != null) {
                DeviceDetailSheet(
                    device = selectedDevice!!,
                    sheetState = sheetState,
                    onDismissRequest = {
                        scope.launch { sheetState.hide() }
                            .invokeOnCompletion { selectedDevice = null }
                    }
                )
            }
        }
    }
}

@Composable
fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(start = 16.dp, top = 6.dp, bottom = 8.dp)
    )
}

@Composable
fun DeviceListTile(device: DeviceItem, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp, horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        val (icon, color) = getDeviceIconAndColor(device.type)
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(color),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, null, tint = Color.White, modifier = Modifier.size(24.dp))
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                device.name,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                "${device.appName} ${device.appVersion}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                "${device.location} • ${device.lastSeen}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun getDeviceIconAndColor(type: DeviceType): Pair<ImageVector, Color> {
    return when (type) {
        DeviceType.Android -> Icons.Rounded.Android to Color(0xFF3DDC84)
        DeviceType.Windows -> Icons.Rounded.Computer to Color(0xFF0078D4)
        DeviceType.Website -> Icons.Rounded.Public to Color(0xFFFB8C00)
    }
}

private fun DeviceItem.matchesQuery(query: String): Boolean {
    val keyword = when (type) {
        DeviceType.Android -> "android"
        DeviceType.Windows -> "windows"
        DeviceType.Website -> "web"
    }

    return name.contains(query, ignoreCase = true) ||
            appName.contains(query, ignoreCase = true) ||
            appVersion.contains(query, ignoreCase = true) ||
            ipAddress.contains(query, ignoreCase = true) ||
            location.contains(query, ignoreCase = true) ||
            lastSeen.contains(query, ignoreCase = true) ||
            keyword.contains(query, ignoreCase = true)
}

@Preview(showBackground = true)
@Composable
fun DevicesListPreview() {
    val focusRequester = remember { FocusRequester() }

    NekoShareTheme {
        DevicesContent(
            isSearchActive = false,
            searchQuery = "",
            focusRequester = focusRequester,
            onSearchQueryChange = {},
            onSearchActiveChange = {},
            onNotificationsClick = {},
            onSettingsClick = {}
        )
    }
}
