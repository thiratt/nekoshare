package com.thiratt.nekoshare.features.auth.presentation.login

import android.util.Patterns
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Email
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.thiratt.nekoshare.BuildConfig
import com.thiratt.nekoshare.core.designsystem.components.NekoButton
import com.thiratt.nekoshare.core.designsystem.components.NekoTextField
import com.thiratt.nekoshare.core.designsystem.theme.NekoShareTheme
import com.thiratt.nekoshare.features.auth.data.AuthRepository
import com.thiratt.nekoshare.features.auth.data.EmailLoginResult
import com.thiratt.nekoshare.features.auth.data.getGoogleAuthErrorMessage
import kotlinx.coroutines.launch

private const val GOOGLE_SIGN_IN_FALLBACK = "ไม่สามารถเข้าสู่ระบบด้วย Google ได้ในขณะนี้"
private const val GOOGLE_NO_ACCOUNT_MESSAGE = "ไม่พบบัญชี Google ในอุปกรณ์นี้ กรุณาเพิ่มบัญชีก่อนแล้วลองอีกครั้ง"

sealed interface LoginNavEvent {
    data object Back : LoginNavEvent
    data object Home : LoginNavEvent
    data object ForgotPassword : LoginNavEvent
    data object Signup : LoginNavEvent
}

@Composable
fun LoginRoute(
    onNavigate: (LoginNavEvent) -> Unit
) {
    LoginScreen(
        onBackClick = { onNavigate(LoginNavEvent.Back) },
        onLoginClick = { onNavigate(LoginNavEvent.Home) },
        onForgotPasswordClick = { onNavigate(LoginNavEvent.ForgotPassword) },
        onSignUpClick = { onNavigate(LoginNavEvent.Signup) }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onBackClick: () -> Unit,
    onLoginClick: () -> Unit,
    onForgotPasswordClick: () -> Unit,
    onSignUpClick: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isPasswordVisible by remember { mutableStateOf(false) }
    var emailError by remember { mutableStateOf<String?>(null) }
    var generalError by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    val scrollState = rememberScrollState()
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current
    val authRepository = remember(context) { AuthRepository(context.applicationContext) }
    val credentialManager = remember(context) { CredentialManager.create(context) }

    fun submitEmailLogin() {
        if (isLoading) {
            return
        }

        val normalizedEmail = email.trim()
        if (!Patterns.EMAIL_ADDRESS.matcher(normalizedEmail).matches()) {
            emailError = "กรุณากรอกอีเมลให้ถูกต้อง"
            return
        }

        emailError = null
        generalError = null
        isLoading = true

        coroutineScope.launch {
            when (val result = authRepository.loginWithEmail(normalizedEmail, password)) {
                is EmailLoginResult.Success -> {
                    isLoading = false
                    onLoginClick()
                }

                is EmailLoginResult.Failure -> {
                    isLoading = false
                    generalError = result.message
                }
            }
        }
    }

    fun signInWithGoogle() {
        if (isLoading) {
            return
        }

        generalError = null
        emailError = null
        isLoading = true

        coroutineScope.launch {
            try {
                val googleIdOption = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(BuildConfig.GOOGLE_SERVER_CLIENT_ID)
                    .setAutoSelectEnabled(false)
                    .build()

                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build()

                val result = credentialManager.getCredential(
                    request = request,
                    context = context
                )

                val credential = result.credential
                val isGoogleCredential =
                    credential is CustomCredential &&
                        credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL

                if (!isGoogleCredential) {
                    isLoading = false
                    generalError = GOOGLE_SIGN_IN_FALLBACK
                } else {
                    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    val idToken = googleIdTokenCredential.idToken

                    when (val loginResult = authRepository.loginWithGoogleIdToken(idToken)) {
                        is EmailLoginResult.Success -> {
                            isLoading = false
                            onLoginClick()
                        }

                        is EmailLoginResult.Failure -> {
                            isLoading = false
                            generalError = loginResult.message
                        }
                    }
                }
            } catch (e: NoCredentialException) {
                isLoading = false
                generalError = GOOGLE_NO_ACCOUNT_MESSAGE
            } catch (e: GetCredentialCancellationException) {
                isLoading = false
            } catch (e: GetCredentialException) {
                isLoading = false
                generalError = getGoogleAuthErrorMessage(e.message.orEmpty()) ?: GOOGLE_SIGN_IN_FALLBACK
            } catch (e: Exception) {
                isLoading = false
                generalError = getGoogleAuthErrorMessage(e.message.orEmpty()) ?: GOOGLE_SIGN_IN_FALLBACK
            }
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = "ย้อนกลับ"
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = Color.Transparent
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .imePadding()
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "ยินดีต้อนรับกลับ",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "กรุณากรอกข้อมูลเพื่อเข้าสู่ระบบ",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            if (generalError != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = generalError!!,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                NekoTextField(
                    label = "อีเมล",
                    value = email,
                    onValueChange = {
                        email = it
                        emailError = null
                        generalError = null
                    },
                    placeholder = "hello@example.com",
                    leadingIcon = {
                        Icon(Icons.Rounded.Email, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    },
                    isError = emailError != null,
                    errorMessage = emailError,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    )
                )

                Column {
                    NekoTextField(
                        label = "รหัสผ่าน",
                        value = password,
                        onValueChange = {
                            password = it
                            generalError = null
                        },
                        placeholder = "••••••••",
                        leadingIcon = {
                            Icon(Icons.Rounded.Lock, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        },
                        trailingIcon = {
                            val icon = if (isPasswordVisible) {
                                Icons.Rounded.Visibility
                            } else {
                                Icons.Rounded.VisibilityOff
                            }
                            IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                                Icon(imageVector = icon, contentDescription = null)
                            }
                        },
                        visualTransformation = if (isPasswordVisible) {
                            VisualTransformation.None
                        } else {
                            PasswordVisualTransformation()
                        },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        )
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        Text(
                            text = "ลืมรหัสผ่าน?",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .clickable { onForgotPasswordClick() }
                                .padding(4.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            NekoButton(
                text = "เข้าสู่ระบบ",
                onClick = { submitEmailLogin() },
                fullWidth = true,
                enabled = email.isNotEmpty() && password.isNotEmpty() && !isLoading
            )

            Spacer(modifier = Modifier.height(32.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                HorizontalDivider(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant)
                Text(
                    text = "หรือเข้าสู่ระบบด้วย",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
                HorizontalDivider(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant)
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                SocialButton(
                    onClick = { signInWithGoogle() },
                    icon = { Text("G", fontWeight = FontWeight.Bold) }
                )
            }

            Spacer(modifier = Modifier.height(48.dp))

            Row {
                Text(
                    "ยังไม่มีบัญชีใช่ไหม?",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .padding(vertical = 4.dp)
                )
                Text(
                    "สมัครสมาชิก",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .clickable { onSignUpClick() }
                        .padding(4.dp)
                )
            }
        }
    }
}

@Composable
fun SocialButton(
    onClick: () -> Unit,
    icon: @Composable () -> Unit
) {
    Box(
        modifier = Modifier
            .size(56.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .then(
                Modifier.border(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.outlineVariant,
                    shape = CircleShape
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        icon()
    }
}

@Preview(showBackground = true)
@Composable
fun LoginScreenPreview() {
    NekoShareTheme {
        LoginScreen(
            onBackClick = {},
            onLoginClick = {},
            onForgotPasswordClick = {},
            onSignUpClick = {}
        )
    }
}
