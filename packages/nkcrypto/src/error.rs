use std::fmt;

#[derive(Debug)]
pub enum CryptoError {
    EncryptionFailed(ring::error::Unspecified),
    DecryptionFailed(ring::error::Unspecified),
    NonceFailed,
    CiphertextTooShort { len: usize, min: usize },
}

impl fmt::Display for CryptoError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CryptoError::EncryptionFailed(_) => write!(f, "encryption failed"),
            CryptoError::DecryptionFailed(_) => write!(f, "decryption failed"),
            CryptoError::NonceFailed => write!(f, "nonce generation failed"),
            CryptoError::CiphertextTooShort { len, min } => {
                write!(f, "ciphertext too short: {len} bytes, minimum {min} required")
            }
        }
    }
}

impl std::error::Error for CryptoError {}