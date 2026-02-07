use std::sync::Arc;

use anyhow::Context;
use rustls::client::danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier};
use rustls::pki_types::{CertificateDer, PrivateKeyDer, PrivatePkcs8KeyDer, ServerName, UnixTime};
use rustls::server::danger::{ClientCertVerified, ClientCertVerifier};
use rustls::{ClientConfig, DigitallySignedStruct, Error, SignatureScheme};

use sha2::{Digest, Sha256};

use crate::core::device::DeviceManager;
use crate::state::GlobalState;

const SUPPORTED_SCHEMES: &[SignatureScheme] = &[
    SignatureScheme::ED25519,
    SignatureScheme::ECDSA_NISTP256_SHA256,
    SignatureScheme::ECDSA_NISTP384_SHA384,
    SignatureScheme::RSA_PSS_SHA256,
    SignatureScheme::RSA_PSS_SHA384,
    SignatureScheme::RSA_PSS_SHA512,
    SignatureScheme::RSA_PKCS1_SHA256,
    SignatureScheme::RSA_PKCS1_SHA384,
    SignatureScheme::RSA_PKCS1_SHA512,
];

#[derive(Debug, Clone)]
pub struct FingerprintVerifier {
    pub expected_fingerprint: String,
}

impl FingerprintVerifier {
    pub fn new(expected_fingerprint: String) -> Result<Self, Error> {
        if expected_fingerprint.len() != 64
            || !expected_fingerprint.chars().all(|c| c.is_ascii_hexdigit())
        {
            return Err(Error::General("invalid SHA-256 fingerprint format".into()));
        }

        Ok(Self {
            expected_fingerprint: expected_fingerprint.to_ascii_lowercase(),
        })
    }

    #[inline]
    fn verify_fingerprint(&self, cert: &CertificateDer<'_>) -> Result<(), Error> {
        let digest = Sha256::digest(cert.as_ref());

        if hex::encode(digest) == self.expected_fingerprint {
            Ok(())
        } else {
            Err(Error::General("certificate fingerprint mismatch".into()))
        }
    }
}

impl ServerCertVerifier for FingerprintVerifier {
    fn verify_server_cert(
        &self,
        end_entity: &CertificateDer<'_>,
        _intermediates: &[CertificateDer<'_>],
        _server_name: &ServerName<'_>,
        _ocsp_response: &[u8],
        _now: UnixTime,
    ) -> Result<ServerCertVerified, Error> {
        self.verify_fingerprint(end_entity)?;
        Ok(ServerCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, Error> {
        Ok(HandshakeSignatureValid::assertion())
    }

    fn verify_tls13_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, Error> {
        Ok(HandshakeSignatureValid::assertion())
    }

    fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
        SUPPORTED_SCHEMES.to_vec()
    }
}

impl ClientCertVerifier for FingerprintVerifier {
    fn root_hint_subjects(&self) -> &[rustls::DistinguishedName] {
        &[]
    }

    fn verify_client_cert(
        &self,
        end_entity: &CertificateDer<'_>,
        _intermediates: &[CertificateDer<'_>],
        _now: UnixTime,
    ) -> Result<ClientCertVerified, Error> {
        self.verify_fingerprint(end_entity)?;
        Ok(ClientCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, Error> {
        Ok(HandshakeSignatureValid::assertion())
    }

    fn verify_tls13_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, Error> {
        Ok(HandshakeSignatureValid::assertion())
    }

    fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
        SUPPORTED_SCHEMES.to_vec()
    }
}

pub fn load_certificates(fingerprint: String) -> Result<ClientConfig, Box<dyn std::error::Error>> {
    let device_manager = GlobalState::get::<DeviceManager>();
    let key_info = device_manager.key().context("Failed to get device key")?;

    let client_certs = vec![CertificateDer::from(key_info.cert_der)];
    let client_key = PrivateKeyDer::Pkcs8(PrivatePkcs8KeyDer::from(key_info.key_der));

    let verifier = Arc::new(FingerprintVerifier::new(fingerprint)?);

    let config = ClientConfig::builder()
        .dangerous()
        .with_custom_certificate_verifier(verifier)
        .with_client_auth_cert(client_certs, client_key)?;

    Ok(config)
}
