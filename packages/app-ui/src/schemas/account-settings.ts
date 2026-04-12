import { z } from "zod";

export const ACCOUNT_AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const ACCOUNT_AVATAR_OUTPUT_SIZE = 512;
export const ACCOUNT_DELETE_CONFIRMATION_PHRASE = "delete my account";
export const ACCOUNT_DISPLAY_NAME_MAX_LENGTH = 100;
export const ACCOUNT_PASSWORD_MAX_LENGTH = 16;
export const ACCOUNT_PASSWORD_MIN_LENGTH = 8;
export const ACCOUNT_USERNAME_MAX_LENGTH = 16;
export const ACCOUNT_USERNAME_MIN_LENGTH = 3;

const passwordFieldSchema = z
	.string()
	.min(ACCOUNT_PASSWORD_MIN_LENGTH, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร")
	.max(ACCOUNT_PASSWORD_MAX_LENGTH, "รหัสผ่านต้องมีความยาวไม่เกิน 16 ตัวอักษร");

const usernameFieldSchema = z
	.string()
	.trim()
	.min(ACCOUNT_USERNAME_MIN_LENGTH, "ชื่อผู้ใช้งานต้องมีอย่างน้อย 3 ตัวอักษร")
	.max(ACCOUNT_USERNAME_MAX_LENGTH, "ชื่อผู้ใช้งานต้องมีความยาวไม่เกิน 16 ตัวอักษร")
	.regex(/^[a-zA-Z0-9_.]+$/, "ชื่อผู้ใช้งานใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข จุด และขีดล่าง");

export const displayNameSchema = z.object({
	displayName: z
		.string()
		.trim()
		.min(1, "กรุณากรอกชื่อที่แสดง")
		.max(ACCOUNT_DISPLAY_NAME_MAX_LENGTH, "ชื่อที่แสดงต้องมีความยาวไม่เกิน 100 ตัวอักษร"),
});

export const usernameSchema = z.object({
	username: usernameFieldSchema,
});

export const changeEmailSchema = z
	.object({
		confirmEmail: z.string().trim().email("กรุณากรอกอีเมลให้ถูกต้อง"),
		newEmail: z.string().trim().email("กรุณากรอกอีเมลให้ถูกต้อง"),
	})
	.superRefine((value, context) => {
		if (value.newEmail !== value.confirmEmail) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "อีเมลทั้งสองช่องต้องตรงกัน",
				path: ["confirmEmail"],
			});
		}
	});

export const setPasswordSchema = z
	.object({
		confirmPassword: passwordFieldSchema,
		newPassword: passwordFieldSchema,
	})
	.superRefine((value, context) => {
		if (value.newPassword !== value.confirmPassword) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "รหัสผ่านยืนยันไม่ตรงกัน",
				path: ["confirmPassword"],
			});
		}
	});

export const changePasswordSchema = z
	.object({
		confirmPassword: passwordFieldSchema,
		currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
		newPassword: passwordFieldSchema,
	})
	.superRefine((value, context) => {
		if (value.newPassword !== value.confirmPassword) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "รหัสผ่านยืนยันไม่ตรงกัน",
				path: ["confirmPassword"],
			});
		}

		if (value.currentPassword === value.newPassword) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน",
				path: ["newPassword"],
			});
		}
	});

export const createDeleteAccountSchema = (expectedUsername: string, requirePassword: boolean) =>
	z.object({
		password: requirePassword ? z.string().min(1, "กรุณากรอกรหัสผ่าน") : z.string().optional(),
		phrase: z
			.string()
			.trim()
			.refine((value) => value === ACCOUNT_DELETE_CONFIRMATION_PHRASE, {
				message: `กรุณาพิมพ์ "${ACCOUNT_DELETE_CONFIRMATION_PHRASE}" ให้ตรงกัน`,
			}),
		username: z
			.string()
			.trim()
			.refine((value) => value === expectedUsername, {
				message: "ชื่อผู้ใช้ยืนยันไม่ตรงกับบัญชีปัจจุบัน",
			}),
	});

export type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type DisplayNameFormValues = z.infer<typeof displayNameSchema>;
export type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;
export type UsernameFormValues = z.infer<typeof usernameSchema>;

export interface DeleteAccountFormValues {
	password?: string;
	phrase: string;
	username: string;
}
