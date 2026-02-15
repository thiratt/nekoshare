package com.thiratt.nekoshare.core.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.toMutableStateList

class SafeNavigator(
    val backStack: MutableList<Any>
) {
    private var lastClickTime = 0L
    private val debounceTime = 300L

    fun push(route: Any) {
        if (canClick()) {
            if (backStack.lastOrNull() != route) {
                backStack.add(route)
            }
        }
    }

    fun pop() {
        if (canClick()) {
            backStack.removeLastOrNull()
        }
    }

    fun navigateSingleTop(route: Any) {
        if (!canClick()) return

        val existingIndex = backStack.indexOfLast { it::class == route::class }

        if (existingIndex != -1) {
            while (backStack.lastIndex > existingIndex) {
                backStack.removeLastOrNull()
            }
        } else {
            backStack.add(route)
        }
    }

    fun setRoot(route: Any) {
        if (canClick()) {
            backStack.clear()
            backStack.add(route)
        }
    }

    private fun canClick(): Boolean {
        val currentTime = System.currentTimeMillis()
        return if (currentTime - lastClickTime > debounceTime) {
            lastClickTime = currentTime
            true
        } else {
            false
        }
    }
}

@Composable
fun rememberSafeNavigator(startDestination: Any): SafeNavigator {
    val backStack = remember { listOf(startDestination).toMutableStateList() }
    return remember { SafeNavigator(backStack) }
}