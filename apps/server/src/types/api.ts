export type ApiSuccessResponse<T> = {
	success: true;
	data: T;
};

export type ApiErrorResponse = {
	success: false;
	error: string;
	message?: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export const success = <T>(data: T): ApiSuccessResponse<T> => ({
	success: true,
	data,
});

export const error = (error: string, message?: string): ApiErrorResponse => ({
	success: false,
	error,
	message,
});

export interface Device {
	id: string;
	deviceIdentifier: string;
	name: string;
	platform: Platform;
	ip: Ip;
	battery: BatteryInfo;
	fingerprint?: string;
	lastActiveAt: Date;
}

export interface Platform {
	os: Os;
	version: string;
	long_version: string;
}

export interface Ip {
	ipv4: string;
	ipv6?: string | null;
	is_tailscale: boolean;
}

export interface BatteryInfo {
	supported: boolean;
	charging: boolean;
	percent: number;
}

export type DeviceListResponse = {
	devices: Device[];
	total: number;
};

export interface DeviceRegistrationRequest extends Device {}

export const OS_TYPES = ["windows", "android", "web", "other"] as const;
export type Os = (typeof OS_TYPES)[number];

export type DeviceRegistrationResponse = {
	device: Device;
	isNew: boolean;
};

export const FRIEND_STATUSES = ["none", "outgoing", "incoming", "friend", "blocked"] as const;
export type FriendStatus = (typeof FRIEND_STATUSES)[number];

export type FriendItem = {
	id: string;
	friendId: string;
	name: string;
	email: string;
	avatarUrl?: string;
	status: FriendStatus;
	sharedCount: number;
	lastActive: string;
	createdAt: string;
	isOnline: boolean;
};

export type FriendListResponse = {
	friends: FriendItem[];
	incoming: FriendItem[];
	outgoing: FriendItem[];
	total: { friends: number; incoming: number; outgoing: number };
};

export type FriendRequestPayload = {
	userId: string;
};

export type FriendActionResponse = {
	success: boolean;
	friendId: string;
	status: FriendStatus;
};

export type UserSearchResult = {
	id: string;
	name: string;
	email: string;
	avatarUrl?: string;
	friendStatus: FriendStatus;
};

export type UserSearchResponse = {
	users: UserSearchResult[];
	total: number;
};
