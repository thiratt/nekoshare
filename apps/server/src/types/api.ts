import type {
	ApiErrorResponse,
	ApiResponse,
	ApiSuccessResponse,
	Device,
	DeviceListResponse,
	DeviceRegistrationResponse,
	FriendActionResponse,
	FriendItem,
	FriendListResponse,
	FriendRequestPayload,
	FriendStatus,
	Os,
	Platform,
	UserSearchResponse,
	UserSearchResult,
} from "@workspace/contracts/api";

export type {
	ApiErrorResponse,
	ApiResponse,
	ApiSuccessResponse,
	Device,
	DeviceListResponse,
	DeviceRegistrationResponse,
	FriendActionResponse,
	FriendItem,
	FriendListResponse,
	FriendRequestPayload,
	FriendStatus,
	Os,
	Platform,
	UserSearchResponse,
	UserSearchResult,
};

export const success = <T>(data: T): ApiSuccessResponse<T> => ({
	success: true,
	data,
});

export const error = (errorCode: string, message?: string): ApiErrorResponse => ({
	success: false,
	error: errorCode,
	message,
});
