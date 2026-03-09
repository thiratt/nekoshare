use std::time::Instant;

use jni::objects::{JByteArray, JClass};
use jni::{EnvUnowned, jni_str};
use jni_fn::jni_fn;

use crate::cipher::{generate_key, Cipher};

#[jni_fn("com.thiratt.nekoshare.core.jni.NkCrypto")]
pub fn generateKey<'caller>(
    mut unowned_env: EnvUnowned<'caller>,
    _class: JClass<'caller>,
) -> JByteArray<'caller> {
    let outcome = unowned_env.with_env(|mut env| -> Result<_, jni::errors::Error> {
        let key = generate_key();

        let z = env.new_byte_array(key.len())?;
        z.set_region(&mut env, 0, bytemuck::cast_slice(&key))?;

        Ok(z)
    });

    outcome.resolve::<jni::errors::ThrowRuntimeExAndDefault>()
}

#[jni_fn("com.thiratt.nekoshare.core.jni.NkCrypto")]
pub fn encrypt<'caller>(
    mut unowned_env: EnvUnowned<'caller>,
    _class: JClass<'caller>,
    key: JByteArray<'caller>,
    plaintext: JByteArray<'caller>,
) -> JByteArray<'caller> {
    let outcome = unowned_env.with_env(|mut env| -> Result<_, jni::errors::Error> {
        let key_bytes = env.convert_byte_array(&key)?;
        let plaintext_bytes = env.convert_byte_array(&plaintext)?;

        let key_arr: [u8; 32] = match key_bytes.try_into() {
            Ok(arr) => arr,
            Err(_) => {
                let class = jni_str!("java/lang/IllegalArgumentException");
                let msg = jni_str!("key must be exactly 32 bytes");
                env.throw_new(class, msg)?;
                return Err(jni::errors::Error::JavaException);
            }
        };

        let cipher = Cipher::new(&key_arr);
        let encrypted = match cipher.encrypt(&plaintext_bytes) {
            Ok(data) => data,
            Err(_e) => {
                let class = jni_str!("java/lang/RuntimeException");
                let msg = jni_str!("Cannot encrypt data: Unknown error");
                env.throw_new(class, msg)?;
                return Err(jni::errors::Error::JavaException);
            }
        };

        let result = env.new_byte_array(encrypted.len())?;
        result.set_region(&mut env, 0, bytemuck::cast_slice(&encrypted))?;
        Ok(result)
    });

    outcome.resolve::<jni::errors::ThrowRuntimeExAndDefault>()
}

#[jni_fn("com.thiratt.nekoshare.core.jni.NkCrypto")]
pub fn decrypt<'caller>(
    mut unowned_env: EnvUnowned<'caller>,
    _class: JClass<'caller>,
    key: JByteArray<'caller>,
    data: JByteArray<'caller>,
) -> JByteArray<'caller> {
    let outcome = unowned_env.with_env(|mut env| -> Result<_, jni::errors::Error> {
        let key_bytes = env.convert_byte_array(&key)?;
        let data_bytes = env.convert_byte_array(&data)?;

        let key_arr: [u8; 32] = match key_bytes.try_into() {
            Ok(arr) => arr,
            Err(_) => {
                let class = jni_str!("java/lang/IllegalArgumentException");
                let msg = jni_str!("key must be exactly 32 bytes");
                env.throw_new(class, msg)?;
                return Err(jni::errors::Error::JavaException);
            }
        };

        let cipher = Cipher::new(&key_arr);
        let decrypted = match cipher.decrypt(&data_bytes) {
            Ok(data) => data,
            Err(_e) => {
                let class = jni_str!("java/lang/RuntimeException");
                let msg = jni_str!("Cannot decrypt data: Unknown error");
                env.throw_new(class, msg)?;
                return Err(jni::errors::Error::JavaException);
            }
        };

        let result = env.new_byte_array(decrypted.len())?;
        result.set_region(&mut env, 0, bytemuck::cast_slice(&decrypted))?;
        Ok(result)
    });

    outcome.resolve::<jni::errors::ThrowRuntimeExAndDefault>()
}
