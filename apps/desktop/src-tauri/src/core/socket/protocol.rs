use std::fmt;

pub const HEADER_SIZE: usize = 5;
pub const TUNNEL_HEADER_SIZE: usize = 13;
pub const MAX_PAYLOAD_SIZE: usize = 16 * 1024 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum PacketType {
    // ==========================================
    // 0x00 - 0x0F: System & Connection (Layer 0)
    // ==========================================
    SystemHandshake = 0x00,
    SystemHeartbeat = 0x01,
    SystemKick = 0x02,
    SystemVersion = 0x03,
    SystemCapabilities = 0x04,

    // ==========================================
    // 0x10 - 0x1F: Authentication (Layer 1)
    // ==========================================
    AuthLoginRequest = 0x10,
    AuthLoginResponse = 0x11,
    AuthTokenRefresh = 0x12,
    AuthTokenRevoke = 0x13,
    AuthLogout = 0x14,

    // ==========================================
    // 0x20 - 0x2F: User & State
    // ==========================================
    UserGetProfile = 0x20,
    UserUpdateProfile = 0x21,
    UserUpdateDevice = 0x22,
    UserStatusChange = 0x23,

    // ==========================================
    // 0x30 - 0x3F: Peer Discovery & Signaling
    // ==========================================
    PeerListRequest = 0x30,
    PeerConnectRequest = 0x31,
    PeerConnectResponse = 0x32,
    PeerSocketReady = 0x33,
    PeerConnectionInfo = 0x34,
    PeerIncomingRequest = 0x35,
    PeerSignalingData = 0x36,
    PeerConnectionConfirm = 0x37,
    PeerDisconnect = 0x38,
    PeerDisconnected = 0x39,
    Ack = 0x3A,

    // ==========================================
    // 0x40 - 0x4F: File Transfer (Control Plane)
    // ==========================================
    FileOffer = 0x40,
    FileAccept = 0x41,
    FileReject = 0x42,
    FilePause = 0x43,
    FileResume = 0x44,
    FileAck = 0x45,
    FileFinish = 0x46,

    // ==========================================
    // 0x50 - 0x5F: File Transfer (Data Plane)
    // ==========================================
    FileChunk = 0x50,

    // ==========================================
    // 0x60 - 0x6F: Clipboard & Text (Utility)
    // ==========================================
    TextMessage = 0x60,
    ClipboardCopy = 0x61,

    // ==========================================
    // 0x70 - 0x8F: Future Features
    // ==========================================
    InputKeyDown = 0x70,
    InputMouseMove = 0x71,

    // ==========================================
    // 0x90 - 0x9F: Device Management
    // ==========================================
    DeviceRename = 0x90,
    DeviceDelete = 0x91,
    DeviceUpdated = 0x92,
    DeviceRemoved = 0x93,
    DeviceAdded = 0x94,

    // ==========================================
    // 0xE0 - 0xEF: Debug & Metrics
    // ==========================================
    DebugLog = 0xE0,
    DebugPerformance = 0xE1,

    // ==========================================
    // 0xF0 - 0xFF: Error & Termination
    // ==========================================
    ErrorGeneric = 0xF0,
    ErrorPermission = 0xF1,
    ErrorNotFound = 0xF2,
    ErrorServerFull = 0xF3,
    Unknown = 0xFF,
}

impl PacketType {
    pub fn from_u8(value: u8) -> Self {
        match value {
            // System
            0x00 => PacketType::SystemHandshake,
            0x01 => PacketType::SystemHeartbeat,
            0x02 => PacketType::SystemKick,
            0x03 => PacketType::SystemVersion,
            0x04 => PacketType::SystemCapabilities,
            // Auth
            0x10 => PacketType::AuthLoginRequest,
            0x11 => PacketType::AuthLoginResponse,
            0x12 => PacketType::AuthTokenRefresh,
            0x13 => PacketType::AuthLogout,
            // User
            0x20 => PacketType::UserGetProfile,
            0x21 => PacketType::UserUpdateProfile,
            0x22 => PacketType::UserUpdateDevice,
            0x23 => PacketType::UserStatusChange,
            // Peer signaling
            0x30 => PacketType::PeerListRequest,
            0x31 => PacketType::PeerConnectRequest,
            0x32 => PacketType::PeerConnectResponse,
            0x33 => PacketType::PeerSocketReady,
            0x34 => PacketType::PeerConnectionInfo,
            0x35 => PacketType::PeerIncomingRequest,
            0x36 => PacketType::PeerSignalingData,
            0x37 => PacketType::PeerConnectionConfirm,
            0x38 => PacketType::PeerDisconnect,
            0x39 => PacketType::PeerDisconnected,
            0x3A => PacketType::Ack,
            // File transfer control
            0x40 => PacketType::FileOffer,
            0x41 => PacketType::FileAccept,
            0x42 => PacketType::FileReject,
            0x43 => PacketType::FilePause,
            0x44 => PacketType::FileResume,
            0x45 => PacketType::FileAck,
            0x46 => PacketType::FileFinish,
            // File transfer data
            0x50 => PacketType::FileChunk,
            // Messaging
            0x60 => PacketType::TextMessage,
            0x61 => PacketType::ClipboardCopy,
            // Input
            0x70 => PacketType::InputKeyDown,
            0x71 => PacketType::InputMouseMove,
            // Device
            0x90 => PacketType::DeviceRename,
            0x91 => PacketType::DeviceDelete,
            0x92 => PacketType::DeviceUpdated,
            0x93 => PacketType::DeviceRemoved,
            0x94 => PacketType::DeviceAdded,
            // Debug
            0xE0 => PacketType::DebugLog,
            0xE1 => PacketType::DebugPerformance,
            // Errors
            0xF0 => PacketType::ErrorGeneric,
            0xF1 => PacketType::ErrorPermission,
            0xF2 => PacketType::ErrorNotFound,
            0xF3 => PacketType::ErrorServerFull,
            _ => PacketType::Unknown,
        }
    }

    pub fn is_error(&self) -> bool {
        (*self as u8) >= 0xF0
    }

    pub fn is_system(&self) -> bool {
        (*self as u8) <= 0x0F
    }

    pub fn is_auth(&self) -> bool {
        let val = *self as u8;
        val >= 0x10 && val <= 0x1F
    }

    pub fn is_peer(&self) -> bool {
        let val = *self as u8;
        val >= 0x30 && val <= 0x3F
    }

    pub fn is_file(&self) -> bool {
        let val = *self as u8;
        (val >= 0x40 && val <= 0x4F) || (val >= 0x50 && val <= 0x5F)
    }

    pub fn is_tunnel(&self) -> bool {
        let val = *self as u8;
        val >= 0x80 && val <= 0x8F
    }

    pub fn is_data(&self) -> bool {
        let val = *self as u8;
        val >= 0x50 && val <= 0x5F
    }
}

impl From<u8> for PacketType {
    fn from(value: u8) -> Self {
        PacketType::from_u8(value)
    }
}

impl From<PacketType> for u8 {
    fn from(value: PacketType) -> Self {
        value as u8
    }
}

impl fmt::Display for PacketType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}
