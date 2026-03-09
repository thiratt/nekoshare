use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM, NONCE_LEN};
use ring::rand::{SecureRandom, SystemRandom};

use crate::error::CryptoError;

pub const KEY_SIZE: usize = 32;
pub const NONCE_SIZE: usize = NONCE_LEN;
const TAG_SIZE: usize = 16;
const MIN_CIPHERTEXT_LEN: usize = NONCE_SIZE + TAG_SIZE;

pub struct Cipher {
    inner: LessSafeKey,
    rng: SystemRandom,
}

impl Cipher {
    pub fn new(key: &[u8; KEY_SIZE]) -> Self {
        let unbound = UnboundKey::new(&AES_256_GCM, key).expect("invalid key size");
        Self {
            inner: LessSafeKey::new(unbound),
            rng: SystemRandom::new(),
        }
    }

    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, CryptoError> {
        let nonce_bytes = self.generate_nonce()?;
        let nonce = Nonce::assume_unique_for_key(nonce_bytes);

        let mut buf = plaintext.to_vec();
        self.inner
            .seal_in_place_append_tag(nonce, Aad::empty(), &mut buf)
            .map_err(CryptoError::EncryptionFailed)?;

        let mut output = Vec::with_capacity(NONCE_SIZE + buf.len());
        output.extend_from_slice(&nonce_bytes);
        output.extend_from_slice(&buf);
        Ok(output)
    }

    pub fn decrypt(&self, data: &[u8]) -> Result<Vec<u8>, CryptoError> {
        if data.len() < MIN_CIPHERTEXT_LEN {
            return Err(CryptoError::CiphertextTooShort {
                len: data.len(),
                min: MIN_CIPHERTEXT_LEN,
            });
        }

        let (nonce_bytes, ciphertext) = data.split_at(NONCE_SIZE);
        let nonce = Nonce::try_assume_unique_for_key(nonce_bytes)
            .map_err(CryptoError::DecryptionFailed)?;

        let mut buf = ciphertext.to_vec();
        let plaintext = self.inner
            .open_in_place(nonce, Aad::empty(), &mut buf)
            .map_err(CryptoError::DecryptionFailed)?;

        Ok(plaintext.to_vec())
    }

    pub fn encrypt_with_nonce(
        &self,
        nonce_bytes: &[u8; NONCE_SIZE],
        plaintext: &[u8],
    ) -> Result<Vec<u8>, CryptoError> {
        let nonce = Nonce::assume_unique_for_key(*nonce_bytes);
        let mut buf = plaintext.to_vec();
        self.inner
            .seal_in_place_append_tag(nonce, Aad::empty(), &mut buf)
            .map_err(CryptoError::EncryptionFailed)?;
        Ok(buf)
    }

    pub fn decrypt_with_nonce(
        &self,
        nonce_bytes: &[u8; NONCE_SIZE],
        ciphertext: &[u8],
    ) -> Result<Vec<u8>, CryptoError> {
        if ciphertext.len() < TAG_SIZE {
            return Err(CryptoError::CiphertextTooShort {
                len: ciphertext.len(),
                min: TAG_SIZE,
            });
        }

        let nonce = Nonce::assume_unique_for_key(*nonce_bytes);
        let mut buf = ciphertext.to_vec();
        let plaintext = self.inner
            .open_in_place(nonce, Aad::empty(), &mut buf)
            .map_err(CryptoError::DecryptionFailed)?;
        Ok(plaintext.to_vec())
    }

    fn generate_nonce(&self) -> Result<[u8; NONCE_SIZE], CryptoError> {
        let mut nonce = [0u8; NONCE_SIZE];
        self.rng.fill(&mut nonce).map_err(|_| CryptoError::NonceFailed)?;
        Ok(nonce)
    }
}

pub fn generate_key() -> [u8; KEY_SIZE] {
    let rng = SystemRandom::new();
    let mut key = [0u8; KEY_SIZE];
    rng.fill(&mut key).expect("failed to generate key");
    key
}