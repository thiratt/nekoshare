use serde::Serialize;
use std::collections::HashMap;
use std::sync::{Arc, LazyLock, Mutex};
use std::time::{Duration, Instant};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::oneshot;
use tokio::time;
use uuid::Uuid;

const AUTH_CALLBACK_BIND_ADDRESS: &str = "127.0.0.1:0";
const AUTH_CALLBACK_PATH: &str = "/auth/callback";
const AUTH_CALLBACK_TIMEOUT_SECS: u64 = 120;

type AuthCallbackResult = Result<GoogleAuthCallbackPayload, String>;

struct AuthCallbackSession {
    result_rx: Mutex<Option<oneshot::Receiver<AuthCallbackResult>>>,
    cancel_tx: Mutex<Option<oneshot::Sender<()>>>,
}

static AUTH_CALLBACK_SESSIONS: LazyLock<Mutex<HashMap<String, Arc<AuthCallbackSession>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GoogleAuthCallbackServerStartResponse {
    server_id: String,
    callback_url: String,
}

#[derive(Debug, Serialize)]
pub struct GoogleAuthCallbackPayload {
    pub token: Option<String>,
    pub error: Option<String>,
}

struct CallbackRequestTarget<'a> {
    path: &'a str,
    query: &'a str,
}

struct CallbackQueryParams {
    attempt: Option<String>,
    nonce: Option<String>,
    token: Option<String>,
    error: Option<String>,
}

enum CallbackRequestParseResult {
    Valid(GoogleAuthCallbackPayload),
    Invalid,
}

fn remove_auth_callback_session(server_id: &str) -> Option<Arc<AuthCallbackSession>> {
    let mut sessions = AUTH_CALLBACK_SESSIONS
        .lock()
        .expect("auth callback sessions poisoned");
    sessions.remove(server_id)
}

fn get_auth_callback_session(server_id: &str) -> Option<Arc<AuthCallbackSession>> {
    let sessions = AUTH_CALLBACK_SESSIONS
        .lock()
        .expect("auth callback sessions poisoned");
    sessions.get(server_id).cloned()
}

fn insert_auth_callback_session(server_id: String, session: Arc<AuthCallbackSession>) {
    let mut sessions = AUTH_CALLBACK_SESSIONS
        .lock()
        .expect("auth callback sessions poisoned");
    sessions.insert(server_id, session);
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn success_page_html() -> String {
    [
        "<!doctype html>",
        "<html lang=\"en\">",
        "<head>",
        "<meta charset=\"utf-8\" />",
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
        "<title>Verification complete</title>",
        "</head>",
        "<body style=\"margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.6 system-ui,sans-serif;text-align:center;\">",
        "<main>",
        "<p>Verification complete.</p>",
        "<p>You can close this tab now.</p>",
        "</main>",
        "<script>window.setTimeout(()=>window.close(),300);</script>",
        "</body>",
        "</html>",
    ]
    .join("")
}

fn error_page_html(error: &str) -> String {
    let escaped_error = escape_html(error);
    [
        "<!doctype html>",
        "<html lang=\"en\">",
        "<head>",
        "<meta charset=\"utf-8\" />",
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
        "<title>Verification failed</title>",
        "<style>",
        ":root{color-scheme:light;font-family:\"Segoe UI\",Arial,sans-serif;background:#f5efe5;color:#1f2937;}",
        "body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at top,rgba(208,177,144,.28),transparent 40%),linear-gradient(180deg,#fbf7f1 0%,#f1e6d6 100%);}",
        "main{width:min(480px,calc(100vw - 32px));padding:32px 28px;border-radius:24px;background:rgba(255,255,255,.92);box-shadow:0 24px 80px rgba(74,55,40,.15);border:1px solid rgba(125,89,58,.1);}",
        "h1{margin:0 0 12px;font-size:28px;line-height:1.15;}",
        "p{margin:0;line-height:1.6;color:#4b5563;}",
        ".stack{display:grid;gap:14px;}",
        ".detail{margin-top:16px;font-size:13px;color:#6b7280;}",
        "</style>",
        "</head>",
        "<body>",
        "<main class=\"stack\">",
        "<h1>Verification failed</h1>",
        "<p>Nekoshare received the error result.</p>",
        "<p>You can return to the app and try again.</p>",
        "<p class=\"detail\">Status: ",
        &escaped_error,
        "</p>",
        "</main>",
        "<script>window.setTimeout(()=>window.close(),300);</script>",
        "</body>",
        "</html>",
    ]
    .join("")
}

fn invalid_request_page_html() -> &'static str {
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\" /><title>Invalid request</title></head><body><p>Invalid auth callback request.</p></body></html>"
}

fn callback_page_html(payload: &GoogleAuthCallbackPayload) -> String {
    match payload.error.as_deref() {
        Some(error) => error_page_html(error),
        None => success_page_html(),
    }
}

async fn write_html_response(stream: &mut TcpStream, status_line: &str, body: &str) {
    let response = format!(
        "HTTP/1.1 {status_line}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );

    if let Err(error) = stream.write_all(response.as_bytes()).await {
        log::warn!("Failed to write auth callback response: {}", error);
        return;
    }

    let _ = stream.shutdown().await;
}

async fn read_http_request(stream: &mut TcpStream) -> Option<String> {
    let mut buffer = [0_u8; 8192];
    let bytes_read = match stream.read(&mut buffer).await {
        Ok(0) => return None,
        Ok(value) => value,
        Err(error) => {
            log::warn!("Failed to read auth callback request: {}", error);
            return None;
        }
    };

    Some(String::from_utf8_lossy(&buffer[..bytes_read]).into_owned())
}

fn from_hex(value: u8) -> Option<u8> {
    match value {
        b'0'..=b'9' => Some(value - b'0'),
        b'a'..=b'f' => Some(value - b'a' + 10),
        b'A'..=b'F' => Some(value - b'A' + 10),
        _ => None,
    }
}

fn percent_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut output = Vec::with_capacity(bytes.len());
    let mut index = 0;

    while index < bytes.len() {
        match bytes[index] {
            b'+' => {
                output.push(b' ');
                index += 1;
            }
            b'%' if index + 2 < bytes.len() => {
                if let (Some(high), Some(low)) = (from_hex(bytes[index + 1]), from_hex(bytes[index + 2])) {
                    output.push((high << 4) | low);
                    index += 3;
                } else {
                    output.push(bytes[index]);
                    index += 1;
                }
            }
            byte => {
                output.push(byte);
                index += 1;
            }
        }
    }

    String::from_utf8_lossy(&output).into_owned()
}

fn parse_query_params(query: &str) -> HashMap<String, String> {
    let mut params = HashMap::new();

    for pair in query.split('&') {
        if pair.is_empty() {
            continue;
        }

        let (key, value) = match pair.split_once('=') {
            Some((key, value)) => (key, value),
            None => (pair, ""),
        };

        params.insert(percent_decode(key), percent_decode(value));
    }

    params
}

fn parse_callback_request_target(request: &str) -> Option<CallbackRequestTarget<'_>> {
    let request_line = match request.lines().next() {
        Some(request_line) => request_line,
        None => return None,
    };

    let mut parts = request_line.split_whitespace();
    let method = parts.next();
    let target = parts.next();

    if method != Some("GET") {
        return None;
    }

    let target = match target {
        Some(value) => value,
        None => return None,
    };

    let (path, query) = match target.split_once('?') {
        Some((path, query)) => (path, query),
        None => (target, ""),
    };

    Some(CallbackRequestTarget { path, query })
}

fn parse_callback_query_params(query: &str) -> CallbackQueryParams {
    let params = parse_query_params(query);

    CallbackQueryParams {
        attempt: params.get("attempt").cloned().filter(|value| !value.is_empty()),
        nonce: params.get("nonce").cloned().filter(|value| !value.is_empty()),
        token: params.get("token").cloned().filter(|value| !value.is_empty()),
        error: params.get("error").cloned().filter(|value| !value.is_empty()),
    }
}

fn has_expected_callback_params(
    params: &CallbackQueryParams,
    expected_attempt: &str,
    expected_nonce: &str,
) -> bool {
    params.attempt.as_deref() == Some(expected_attempt)
        && params.nonce.as_deref() == Some(expected_nonce)
        && (params.token.is_some() || params.error.is_some())
}

fn parse_callback_request(
    request: &str,
    expected_attempt: &str,
    expected_nonce: &str,
) -> CallbackRequestParseResult {
    let Some(target) = parse_callback_request_target(request) else {
        return CallbackRequestParseResult::Invalid;
    };

    let CallbackRequestTarget { path, query } = target;
    if path != AUTH_CALLBACK_PATH {
        return CallbackRequestParseResult::Invalid;
    }

    let params = parse_callback_query_params(query);
    if !has_expected_callback_params(&params, expected_attempt, expected_nonce) {
        return CallbackRequestParseResult::Invalid;
    }

    CallbackRequestParseResult::Valid(GoogleAuthCallbackPayload {
        token: params.token,
        error: params.error,
    })
}

async fn handle_callback_connection(
    mut stream: TcpStream,
    expected_attempt: &str,
    expected_nonce: &str,
) -> Option<GoogleAuthCallbackPayload> {
    let request = match read_http_request(&mut stream).await {
        Some(value) => value,
        None => return None,
    };

    match parse_callback_request(&request, expected_attempt, expected_nonce) {
        CallbackRequestParseResult::Valid(payload) => {
            let body = callback_page_html(&payload);
            write_html_response(&mut stream, "200 OK", &body).await;
            Some(payload)
        }
        CallbackRequestParseResult::Invalid => {
            write_html_response(&mut stream, "400 Bad Request", invalid_request_page_html()).await;
            None
        }
    }
}

async fn run_google_auth_callback_server(
    listener: TcpListener,
    expected_attempt: String,
    expected_nonce: String,
    result_tx: oneshot::Sender<AuthCallbackResult>,
    mut cancel_rx: oneshot::Receiver<()>,
) {
    let deadline = Instant::now() + Duration::from_secs(AUTH_CALLBACK_TIMEOUT_SECS);

    let result = loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            break Err("Google login timed out. Please try again.".to_string());
        }

        let accept_result = tokio::select! {
            _ = &mut cancel_rx => {
                break Err("Google login was cancelled.".to_string());
            }
            result = time::timeout(remaining, listener.accept()) => result
        };

        let (stream, address) = match accept_result {
            Ok(Ok(value)) => value,
            Ok(Err(error)) => {
                log::warn!("Failed to accept auth callback connection: {}", error);
                continue;
            }
            Err(_) => {
                break Err("Google login timed out. Please try again.".to_string());
            }
        };

        log::info!("Accepted Google auth callback connection from {}", address);

        if let Some(payload) = handle_callback_connection(stream, &expected_attempt, &expected_nonce).await {
            break Ok(payload);
        }
    };

    let _ = result_tx.send(result);
}

#[tauri::command]
pub async fn ns_start_google_auth_callback_server(
    attempt: String,
) -> Result<GoogleAuthCallbackServerStartResponse, String> {
    let listener = TcpListener::bind(AUTH_CALLBACK_BIND_ADDRESS)
        .await
        .map_err(|error| format!("Failed to start Google login callback listener: {}", error))?;
    let local_addr = listener
        .local_addr()
        .map_err(|error| format!("Failed to read Google login callback listener address: {}", error))?;

    let server_id = Uuid::new_v4().to_string();
    let nonce = Uuid::new_v4().to_string();
    let callback_url = format!(
        "http://127.0.0.1:{}{}?attempt={}&nonce={}",
        local_addr.port(),
        AUTH_CALLBACK_PATH,
        attempt,
        nonce
    );

    let (result_tx, result_rx) = oneshot::channel::<AuthCallbackResult>();
    let (cancel_tx, cancel_rx) = oneshot::channel::<()>();

    insert_auth_callback_session(
        server_id.clone(),
        Arc::new(AuthCallbackSession {
            result_rx: Mutex::new(Some(result_rx)),
            cancel_tx: Mutex::new(Some(cancel_tx)),
        }),
    );

    tokio::spawn(run_google_auth_callback_server(
        listener,
        attempt,
        nonce,
        result_tx,
        cancel_rx,
    ));

    Ok(GoogleAuthCallbackServerStartResponse {
        server_id,
        callback_url,
    })
}

#[tauri::command]
pub async fn ns_wait_google_auth_callback_server(
    server_id: String,
) -> Result<GoogleAuthCallbackPayload, String> {
    let session = get_auth_callback_session(&server_id)
        .ok_or_else(|| "Google login callback listener was not found.".to_string())?;
    let result_rx = session
        .result_rx
        .lock()
        .map_err(|_| "Google login callback listener state is poisoned.".to_string())?
        .take()
        .ok_or_else(|| "Google login callback listener has already been consumed.".to_string())?;

    let result = result_rx
        .await
        .map_err(|_| "Google login callback listener stopped unexpectedly.".to_string())?;

    let _ = remove_auth_callback_session(&server_id);

    result
}

#[tauri::command]
pub fn ns_cancel_google_auth_callback_server(server_id: String) -> Result<(), String> {
    let Some(session) = remove_auth_callback_session(&server_id) else {
        return Ok(());
    };

    if let Some(cancel_tx) = session
        .cancel_tx
        .lock()
        .map_err(|_| "Google login callback listener state is poisoned.".to_string())?
        .take()
    {
        let _ = cancel_tx.send(());
    }

    Ok(())
}
