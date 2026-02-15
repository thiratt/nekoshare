package com.thiratt.nekoshare.features.auth.presentation.welcome

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.thiratt.nekoshare.core.designsystem.components.NekoButton
import com.thiratt.nekoshare.core.designsystem.components.NekoButtonVariant
import com.thiratt.nekoshare.core.designsystem.theme.LightPrimary
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme

@Composable
fun WelcomeRoute(
    onNavigateToLogin: () -> Unit,
    onNavigateToRegister: () -> Unit
) {
    WelcomeScreen(
        onLoginClick = onNavigateToLogin,
        onRegisterClick = onNavigateToRegister
    )
}

@Composable
fun WelcomeScreen(
    onLoginClick: () -> Unit,
    onRegisterClick: () -> Unit,
) {
    Scaffold { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
            ,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.weight(1f))

            Box(
                modifier = Modifier
                    .size(88.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(LightPrimary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Rounded.Share,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = LightPrimary
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = "Seamless Sharing,\nNo Boundaries.",
                style = MaterialTheme.typography.displaySmall.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.5).sp
                ),
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Transfer files across your devices instantly.\nSecure, local, and lightning fast.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                lineHeight = 24.sp
            )

            Spacer(modifier = Modifier.weight(1f))

            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                NekoButton(
                    text = "Login with email",
                    onClick = onLoginClick,
                    fullWidth = true
                )

                NekoButton(
                    text = "Create an account",
                    variant = NekoButtonVariant.Ghost,
                    onClick = onRegisterClick,
                    fullWidth = true
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun WelcomeScreenPreview() {
    NekoShareTheme {
        WelcomeScreen(
            onLoginClick = {},
            onRegisterClick = {}
        )
    }
}