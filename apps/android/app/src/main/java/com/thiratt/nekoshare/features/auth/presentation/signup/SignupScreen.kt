package com.thiratt.nekoshare.features.auth.presentation.signup

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
import androidx.compose.material.icons.rounded.Person
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
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import com.thiratt.nekoshare.features.auth.data.GoogleAuthFlow
import com.thiratt.nekoshare.features.auth.data.getGoogleAuthErrorMessage
import kotlinx.coroutines.launch

private const val GOOGLE_SIGN_UP_FALLBACK = "ไม่สามารถสมัครด้วย Google ได้ในขณะนี้"
private const val GOOGLE_NO_ACCOUNT_MESSAGE = "ไม่พบบัญชี Google ในอุปกรณ์นี้ กรุณาเพิ่มบัญชีก่อนแล้วลองอีกครั้ง"

sealed interface SignupNavEvent {
    data object Back : SignupNavEvent
    data object CreateAccount : SignupNavEvent
    data object Login : SignupNavEvent
}

@Composable
fun SignupRoute(
    onNavigate: (SignupNavEvent) -> Unit
) {
    SignupScreen(
        onBackClick = { onNavigate(SignupNavEvent.Back) },
        onCreateAccountClick = { onNavigate(SignupNavEvent.CreateAccount) },
        onLoginClick = { onNavigate(SignupNavEvent.Login) }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignupScreen(
    onBackClick: () -> Unit,
    onCreateAccountClick: () -> Unit,
    onLoginClick: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isPasswordVisible by remember { mutableStateOf(false) }
    var nameError by remember { mutableStateOf<String?>(null) }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var generalError by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    val scrollState = rememberScrollState()
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current
    val authRepository = remember(context) { AuthRepository(context.applicationContext) }
    val credentialManager = remember(context) { CredentialManager.create(context) }

    fun submitSignup() {
        if (isLoading) {
            return
        }

        val normalizedName = name.trim()
        val normalizedEmail = email.trim()

        nameError = null
        emailError = null
        passwordError = null
        generalError = null

        if (normalizedName.length < 2) {
            nameError = "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร"
            return
        }

        if (!Patterns.EMAIL_ADDRESS.matcher(normalizedEmail).matches()) {
            emailError = "กรุณากรอกอีเมลให้ถูกต้อง"
            return
        }

        if (password.length < 8 || password.length > 16) {
            passwordError = "รหัสผ่านต้องยาว 8-16 ตัวอักษร"
            return
        }

        isLoading = true

        coroutineScope.launch {
            when (
                val result = authRepository.signUpWithEmail(
                    name = normalizedName,
                    email = normalizedEmail,
                    password = password
                )
            ) {
                is EmailLoginResult.Success -> {
                    isLoading = false
                    onCreateAccountClick()
                }

                is EmailLoginResult.Failure -> {
                    isLoading = false
                    generalError = result.message
                }
            }
        }
    }

    fun signUpWithGoogle() {
        if (isLoading) {
            return
        }

        generalError = null
        nameError = null
        emailError = null
        passwordError = null
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

                if (isGoogleCredential) {
                    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    val idToken = googleIdTokenCredential.idToken

                    when (
                        val signupResult = authRepository.loginWithGoogleIdToken(
                            idToken = idToken,
                            flow = GoogleAuthFlow.Signup
                        )
                    ) {
                        is EmailLoginResult.Success -> {
                            isLoading = false
                            onCreateAccountClick()
                        }

                        is EmailLoginResult.Failure -> {
                            isLoading = false
                            generalError = signupResult.message
                        }
                    }
                } else {
                    isLoading = false
                    generalError = GOOGLE_SIGN_UP_FALLBACK
                }
            } catch (e: NoCredentialException) {
                isLoading = false
                generalError = GOOGLE_NO_ACCOUNT_MESSAGE
            } catch (e: GetCredentialCancellationException) {
                isLoading = false
            } catch (e: GetCredentialException) {
                isLoading = false
                generalError = getGoogleAuthErrorMessage(e.message.orEmpty()) ?: GOOGLE_SIGN_UP_FALLBACK
            } catch (e: Exception) {
                isLoading = false
                generalError = getGoogleAuthErrorMessage(e.message.orEmpty()) ?: GOOGLE_SIGN_UP_FALLBACK
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
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "สร้างบัญชี",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "สมัครตอนนี้และเริ่มแชร์ไฟล์ได้อย่างลื่นไหล",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
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
                    label = "ชื่อผู้ใช้งาน",
                    value = name,
                    onValueChange = {
                        name = it
                        nameError = null
                        generalError = null
                    },
                    placeholder = "เช่น Alex123",
                    leadingIcon = {
                        Icon(Icons.Rounded.Person, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    },
                    isError = nameError != null,
                    errorMessage = nameError,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Text,
                        imeAction = ImeAction.Next
                    )
                )

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

                NekoTextField(
                    label = "รหัสผ่าน",
                    value = password,
                    onValueChange = {
                        password = it
                        passwordError = null
                        generalError = null
                    },
                    placeholder = "ตั้งรหัสผ่าน",
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
                    isError = passwordError != null,
                    errorMessage = passwordError,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    )
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            val termsText = buildAnnotatedString {
                append("เมื่อสมัครใช้งาน คุณยอมรับ ")
                withLink(LinkAnnotation.Clickable("terms", linkInteractionListener = { })) {
                    withStyle(SpanStyle(color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)) {
                        append("ข้อกำหนดการใช้งาน")
                    }
                }
                append(" และ ")
                withLink(LinkAnnotation.Clickable("privacy", linkInteractionListener = { })) {
                    withStyle(SpanStyle(color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)) {
                        append("นโยบายความเป็นส่วนตัว")
                    }
                }
                append(".")
            }

            Text(
                text = termsText,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                lineHeight = 20.dp.value.sp
            )

            Spacer(modifier = Modifier.height(24.dp))

            NekoButton(
                text = "สร้างบัญชี",
                onClick = { submitSignup() },
                fullWidth = true,
                enabled = name.isNotBlank() && email.isNotBlank() && password.isNotBlank() && !isLoading
            )

            Spacer(modifier = Modifier.height(32.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                HorizontalDivider(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant)
                Text(
                    text = "หรือสมัครด้วย",
                    style = MaterialTheme.typography.labelSmall,
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
                    onClick = { signUpWithGoogle() },
                    icon = { Text("G", fontWeight = FontWeight.Bold) }
                )
            }

            Spacer(modifier = Modifier.height(48.dp))

            Row {
                Text(
                    "มีบัญชีอยู่แล้ว?",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .padding(vertical = 4.dp)
                )
                Text(
                    "เข้าสู่ระบบ",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .clickable { onLoginClick() }
                        .padding(4.dp)
                )
            }
        }
    }
}

@Composable
private fun SocialButton(
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
fun RegisterScreenPreview() {
    NekoShareTheme {
        SignupScreen({}, {}, {})
    }
}
