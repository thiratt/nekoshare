mod cipher;
mod error;

#[cfg(target_os = "android")]
mod android;

#[cfg(test)]
mod tests;

pub use cipher::{generate_key, Cipher, KEY_SIZE, NONCE_SIZE};
pub use error::CryptoError;