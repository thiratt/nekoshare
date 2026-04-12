import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

import { env } from "@/config/env";

const R2_REGION = "auto";
const USER_PROFILE_AVATAR_CACHE_CONTROL = "public, max-age=31536000, immutable";
const SIGNED_AVATAR_READ_TTL_SECONDS = 60 * 5;

export const USER_PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const USER_PROFILE_AVATAR_CONTENT_TYPES = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
} as const;

type UserProfileAvatarContentType = keyof typeof USER_PROFILE_AVATAR_CONTENT_TYPES;

export interface UserProfileAvatarUploadResult {
	contentType: UserProfileAvatarContentType;
	imageUrl: string;
	objectKey: string;
}

let cachedClient: S3Client | null = null;

export function isUserProfileAvatarContentType(
	value: string | null | undefined,
): value is UserProfileAvatarContentType {
	return !!value && Object.hasOwn(USER_PROFILE_AVATAR_CONTENT_TYPES, value);
}

export function isUserProfileAvatarStorageConfigured(): boolean {
	return env.R2_USER_PROFILE !== undefined;
}

function requireUserProfileAvatarStorageConfig() {
	if (!env.R2_USER_PROFILE) {
		throw new Error("R2 user profile storage is not configured.");
	}

	return env.R2_USER_PROFILE;
}

function getR2Client(): S3Client {
	const config = requireUserProfileAvatarStorageConfig();

	cachedClient ??= new S3Client({
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
		endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
		forcePathStyle: true,
		region: R2_REGION,
	});

	return cachedClient;
}

function encodeObjectKeyPath(value: string): string {
	return value.split("/").map(encodeURIComponent).join("/");
}

function createPublicAvatarUrl(objectKey: string): string {
	const config = requireUserProfileAvatarStorageConfig();

	if (!config.publicBaseUrl) {
		throw new Error("R2_USER_PROFILE_PUBLIC_BASE_URL is required for profile avatar URLs.");
	}

	return `${config.publicBaseUrl.replace(/\/+$/, "")}/${encodeObjectKeyPath(objectKey)}`;
}

function createUserProfileAvatarObjectKey(contentType: UserProfileAvatarContentType): string {
	const extension = USER_PROFILE_AVATAR_CONTENT_TYPES[contentType];
	return `avatar/${randomUUID()}.${extension}`;
}

export async function uploadUserProfileAvatar(params: {
	body: Buffer;
	contentType: UserProfileAvatarContentType;
}): Promise<UserProfileAvatarUploadResult> {
	const config = requireUserProfileAvatarStorageConfig();
	const objectKey = createUserProfileAvatarObjectKey(params.contentType);

	await getR2Client().send(
		new PutObjectCommand({
			Body: params.body,
			Bucket: config.bucket,
			CacheControl: USER_PROFILE_AVATAR_CACHE_CONTROL,
			ContentLength: params.body.byteLength,
			ContentType: params.contentType,
			Key: objectKey,
		}),
	);

	return {
		contentType: params.contentType,
		imageUrl: createPublicAvatarUrl(objectKey),
		objectKey,
	};
}

export async function deleteUserProfileAvatar(objectKey: string): Promise<void> {
	const config = requireUserProfileAvatarStorageConfig();

	await getR2Client().send(
		new DeleteObjectCommand({
			Bucket: config.bucket,
			Key: objectKey,
		}),
	);
}

export async function createSignedUserProfileAvatarReadUrl(objectKey: string): Promise<string> {
	if (!objectKey.startsWith("avatar/")) {
		throw new Error("Invalid avatar key.");
	}

	const config = requireUserProfileAvatarStorageConfig();
	const command = new GetObjectCommand({
		Bucket: config.bucket,
		Key: objectKey,
	});

	return await getSignedUrl(getR2Client(), command, { expiresIn: SIGNED_AVATAR_READ_TTL_SECONDS });
}
