package com.thiratt.nekoshare.features.auth.presentation.welcome

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.thiratt.nekoshare.R
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
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.weight(1f))

            Box(
                modifier = Modifier.size(120.dp),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.nekoshare),
                    contentDescription = "Logo",
                    modifier = Modifier
                        .fillMaxSize()
                        .scale(1.5f),
                    tint = LightPrimary
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "แชร์ได้ลื่นไหล\nไร้ขีดจำกัด",
                style = MaterialTheme.typography.displaySmall.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.5).sp
                ),
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "โอนไฟล์ระหว่างอุปกรณ์ได้ทันที\nปลอดภัย ภายในเครื่อง และรวดเร็ว",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                lineHeight = 24.sp
            )

            Spacer(modifier = Modifier.weight(1.2f))

            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                NekoButton(
                    text = "เข้าสู่ระบบด้วยอีเมล",
                    onClick = onLoginClick,
                    fullWidth = true
                )

                NekoButton(
                    text = "สร้างบัญชี",
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