package com.thiratt.nekoshare.features.home.presentation

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.home.presentation.components.AddFriendEmptyState
import com.thiratt.nekoshare.features.home.presentation.components.AddFriendSearchBar
import com.thiratt.nekoshare.features.home.presentation.components.AddFriendSearchResults

sealed interface AddFriendNavEvent {
    data object Back : AddFriendNavEvent
}

@Composable
fun AddFriendRoute(
    onNavigate: (AddFriendNavEvent) -> Unit
) {
    AddFriendScreen(
        onBackClick = { onNavigate(AddFriendNavEvent.Back) }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddFriendScreen(
    onBackClick: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }

    var activeQuery by remember { mutableStateOf("") }
    if (searchQuery.isNotEmpty()) {
        activeQuery = searchQuery
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("เพิ่มเพื่อน") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "ย้อนกลับ")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    scrolledContainerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            AddFriendSearchBar(
                query = searchQuery,
                onQueryChange = { searchQuery = it }
            )

            AnimatedContent(
                targetState = searchQuery.isEmpty(),
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "ContentTransition",
                modifier = Modifier.fillMaxSize()
            ) { isEmpty ->
                if (isEmpty) {
                    AddFriendEmptyState()
                } else {
                    AddFriendSearchResults(query = activeQuery)
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun AddFriendScreenPreview() {
    NekoShareTheme {
        AddFriendScreen(
            onBackClick = { }
        )
    }
}