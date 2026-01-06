export const HEADER_SIZE = 5;

export enum PacketType {
	// ==========================================
	// 0x00 - 0x0F: System & Connection (Layer 0)
	// ==========================================
	SYSTEM_HANDSHAKE = 0x00,
	SYSTEM_HEARTBEAT = 0x01,
	SYSTEM_KICK = 0x02,

	// ==========================================
	// 0x10 - 0x1F: Authentication (Layer 1)
	// ==========================================
	AUTH_LOGIN_REQUEST = 0x10,
	AUTH_LOGIN_RESPONSE = 0x11,
	AUTH_TOKEN_REFRESH = 0x12,
	AUTH_LOGOUT = 0x13,

	// ==========================================
	// 0x20 - 0x2F: User & State
	// ==========================================
	USER_GET_PROFILE = 0x20,
	USER_UPDATE_PROFILE = 0x21,
	USER_UPDATE_DEVICE = 0x22,
	USER_STATUS_CHANGE = 0x23,

	// ==========================================
	// 0x30 - 0x3F: Peer Discovery & Signaling
	// ==========================================
	PEER_LIST_REQUEST = 0x30,
	PEER_CONNECT_REQUEST = 0x31,
	PEER_SIGNALING_DATA = 0x32,

	// ==========================================
	// 0x40 - 0x4F: File Transfer (Control Plane)
	// ==========================================
	FILE_OFFER = 0x40,
	FILE_ACCEPT = 0x41,
	FILE_REJECT = 0x42,
	FILE_PAUSE = 0x43,
	FILE_RESUME = 0x44,
	FILE_ACK = 0x45,

	// ==========================================
	// 0x50 - 0x5F: File Transfer (Data Plane)
	// ==========================================
	FILE_CHUNK = 0x50,

	// ==========================================
	// 0x60 - 0x6F: Clipboard & Text (Utility)
	// ==========================================
	TEXT_MESSAGE = 0x60,
	CLIPBOARD_COPY = 0x61,

	// ==========================================
	// 0x70 - 0x8F: Future Features
	// ==========================================
	INPUT_KEY_DOWN = 0x70,
	INPUT_MOUSE_MOVE = 0x71,

	// ==========================================
	// 0xE0 - 0xEF: Debug & Metrics
	// ==========================================
	DEBUG_LOG = 0xe0,
	DEBUG_PERFORMANCE = 0xe1,

	// ==========================================
	// 0xF0 - 0xFF: Error & Termination
	// ==========================================
	ERROR_GENERIC = 0xf0,
	ERROR_PERMISSION = 0xf1,
	ERROR_NOT_FOUND = 0xf2,
	ERROR_SERVER_FULL = 0xf3,
}
