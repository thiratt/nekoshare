use crate::{generate_key, Cipher, CryptoError, NONCE_SIZE};

#[test]
fn encrypt_decrypt_round_trip() {
    let plaintext = b"Example secret data to encrypt. This can be any binary data, not just text!";
    let key = generate_key();
    let cipher = Cipher::new(&key);

    let encrypted = cipher.encrypt(plaintext).expect("encryption failed");

    assert_ne!(plaintext.to_vec(), encrypted);
    assert!(encrypted.len() >= NONCE_SIZE + 16 + plaintext.len());

    let decrypted = cipher.decrypt(&encrypted).expect("decryption failed");
    assert_eq!(plaintext.to_vec(), decrypted);
}

#[test]
fn encrypt_produces_unique_ciphertexts() {
    let key = generate_key();
    let cipher = Cipher::new(&key);
    let plaintext = b"same input twice";

    let a = cipher.encrypt(plaintext).unwrap();
    let b = cipher.encrypt(plaintext).unwrap();

    assert_ne!(a, b);
}

#[test]
fn decrypt_with_wrong_key_fails() {
    let key_a = generate_key();
    let key_b = generate_key();
    let cipher_a = Cipher::new(&key_a);
    let cipher_b = Cipher::new(&key_b);

    let encrypted = cipher_a.encrypt(b"secret").unwrap();
    let result = cipher_b.decrypt(&encrypted);

    assert!(result.is_err());
}

#[test]
fn decrypt_tampered_ciphertext_fails() {
    let key = generate_key();
    let cipher = Cipher::new(&key);

    let mut encrypted = cipher.encrypt(b"important data").unwrap();
    let idx = NONCE_SIZE + 1;
    encrypted[idx] ^= 0xFF;

    let result = cipher.decrypt(&encrypted);
    assert!(result.is_err());
}

#[test]
fn decrypt_truncated_ciphertext_fails() {
    let key = generate_key();
    let cipher = Cipher::new(&key);

    let result = cipher.decrypt(&[0u8; 10]);
    assert!(matches!(result, Err(CryptoError::CiphertextTooShort { .. })));
}

#[test]
fn encrypt_empty_plaintext() {
    let key = generate_key();
    let cipher = Cipher::new(&key);

    let encrypted = cipher.encrypt(b"").unwrap();
    assert_eq!(encrypted.len(), NONCE_SIZE + 16);

    let decrypted = cipher.decrypt(&encrypted).unwrap();
    assert!(decrypted.is_empty());
}

#[test]
fn encrypt_large_plaintext() {
    let key = generate_key();
    let cipher = Cipher::new(&key);

    let plaintext = vec![0xABu8; 1024 * 1024];
    let encrypted = cipher.encrypt(&plaintext).unwrap();
    let decrypted = cipher.decrypt(&encrypted).unwrap();

    assert_eq!(plaintext, decrypted);
}

#[test]
fn encrypt_decrypt_with_explicit_nonce() {
    let key = generate_key();
    let cipher = Cipher::new(&key);
    let nonce = [1u8; NONCE_SIZE];
    let plaintext = b"explicit nonce test";

    let ciphertext = cipher.encrypt_with_nonce(&nonce, plaintext).unwrap();
    let decrypted = cipher.decrypt_with_nonce(&nonce, &ciphertext).unwrap();

    assert_eq!(plaintext.to_vec(), decrypted);
}

#[test]
fn error_display_is_meaningful() {
    let err = CryptoError::CiphertextTooShort { len: 5, min: 28 };
    let msg = format!("{err}");
    assert!(msg.contains("5"));
    assert!(msg.contains("28"));
}
