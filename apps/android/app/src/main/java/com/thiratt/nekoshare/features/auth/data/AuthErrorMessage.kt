package com.thiratt.nekoshare.features.auth.data

private const val GOOGLE_AUTH_FALLBACK = "ไม่สามารถใช้งาน Google ได้ในขณะนี้"

fun getGoogleAuthErrorMessage(error: String): String? {
    return when (normalizeAuthErrorKey(error)) {
        "access_denied",
        "google_login_cancelled" -> null

        "signup_disabled",
        "user_not_found" -> "ไม่พบบัญชีสมาชิก กรุณาสมัครก่อน"

        "unable_to_create_user" -> "ไม่สามารถสร้างบัญชีได้ในขณะนี้"

        "invalid_code",
        "invalid_token",
        "session_not_found",
        "state_mismatch",
        "token_expired" -> "เซสชัน Google หมดอายุแล้ว กรุณาลองใหม่อีกครั้ง"

        "account_already_linked_to_different_user" -> "บัญชี Google นี้เชื่อมกับสมาชิกคนอื่นอยู่แล้ว"
        "account_not_linked" -> "บัญชี Google นี้ยังไม่ได้เชื่อมกับสมาชิกในระบบ"
        "email_not_verified" -> "อีเมลของบัญชี Google นี้ยังไม่ได้ยืนยัน"
        "unable_to_get_user_info" -> "ไม่สามารถอ่านข้อมูลบัญชี Google ได้ในขณะนี้"
        "oauth_provider_not_found" -> "Google Sign-In ยังไม่พร้อมใช้งานในขณะนี้"
        "developer_console_is_not_setup_correctly",
        "developer_console_is_not_set_up_correctly" -> "Google Sign-In ยังตั้งค่าไม่สมบูรณ์ กรุณาตรวจสอบ Google Cloud Console"
        "no_credential_available",
        "no_credentials_available" -> "ไม่พบบัญชี Google ในอุปกรณ์นี้ กรุณาเพิ่มบัญชีก่อนแล้วลองอีกครั้ง"
        "desktop_callback_missing",
        "no_callback_url",
        "no_code",
        "oauth_failed" -> GOOGLE_AUTH_FALLBACK

        else -> GOOGLE_AUTH_FALLBACK
    }
}

private fun normalizeAuthErrorKey(value: String): String {
    return value
        .trim()
        .lowercase()
        .replace("'", "")
        .replace("\"", "")
        .replace(Regex("[^a-z0-9]+"), "_")
        .trim('_')
}
