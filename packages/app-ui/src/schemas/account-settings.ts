import { z } from "zod";

import type { AppTFunction } from "@workspace/i18n/resources";

export const ACCOUNT_AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const ACCOUNT_AVATAR_OUTPUT_SIZE = 512;
export const ACCOUNT_DELETE_CONFIRMATION_PHRASE = "delete my account";
export const ACCOUNT_DISPLAY_NAME_MAX_LENGTH = 100;
export const ACCOUNT_PASSWORD_MAX_LENGTH = 16;
export const ACCOUNT_PASSWORD_MIN_LENGTH = 8;
export const ACCOUNT_USERNAME_MAX_LENGTH = 16;
export const ACCOUNT_USERNAME_MIN_LENGTH = 3;

function createPasswordFieldSchema(t: AppTFunction) {
	return z
		.string()
		.min(ACCOUNT_PASSWORD_MIN_LENGTH, t("account.validation.passwordMin"))
		.max(ACCOUNT_PASSWORD_MAX_LENGTH, t("account.validation.passwordMax"));
}

function createUsernameFieldSchema(t: AppTFunction) {
	return z
		.string()
		.trim()
		.min(ACCOUNT_USERNAME_MIN_LENGTH, t("account.validation.usernameMin"))
		.max(ACCOUNT_USERNAME_MAX_LENGTH, t("account.validation.usernameMax"))
		.regex(/^[a-zA-Z0-9_.]+$/, t("account.validation.usernameInvalid"));
}

export function createDisplayNameSchema(t: AppTFunction) {
	return z.object({
		displayName: z
			.string()
			.trim()
			.min(1, t("account.validation.displayNameRequired"))
			.max(ACCOUNT_DISPLAY_NAME_MAX_LENGTH, t("account.validation.displayNameMax")),
	});
}

export function createUsernameSchema(t: AppTFunction) {
	return z.object({
		username: createUsernameFieldSchema(t),
	});
}

export function createChangeEmailSchema(t: AppTFunction) {
	return z
		.object({
			confirmEmail: z.string().trim().email(t("account.validation.emailInvalid")),
			newEmail: z.string().trim().email(t("account.validation.emailInvalid")),
		})
		.superRefine((value, context) => {
			if (value.newEmail !== value.confirmEmail) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					message: t("account.validation.changeEmailMismatch"),
					path: ["confirmEmail"],
				});
			}
		});
}

export function createSetPasswordSchema(t: AppTFunction) {
	const passwordFieldSchema = createPasswordFieldSchema(t);

	return z
		.object({
			confirmPassword: passwordFieldSchema,
			newPassword: passwordFieldSchema,
		})
		.superRefine((value, context) => {
			if (value.newPassword !== value.confirmPassword) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					message: t("account.validation.passwordConfirmMismatch"),
					path: ["confirmPassword"],
				});
			}
		});
}

export function createChangePasswordSchema(t: AppTFunction) {
	const passwordFieldSchema = createPasswordFieldSchema(t);

	return z
		.object({
			confirmPassword: passwordFieldSchema,
			currentPassword: z.string().min(1, t("account.validation.currentPasswordRequired")),
			newPassword: passwordFieldSchema,
		})
		.superRefine((value, context) => {
			if (value.newPassword !== value.confirmPassword) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					message: t("account.validation.passwordConfirmMismatch"),
					path: ["confirmPassword"],
				});
			}

			if (value.currentPassword === value.newPassword) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					message: t("account.validation.newPasswordMustDiffer"),
					path: ["newPassword"],
				});
			}
		});
}

export const createDeleteAccountSchema = (t: AppTFunction, expectedUsername: string, requirePassword: boolean) =>
	z.object({
		password: requirePassword
			? z.string().min(1, t("account.validation.deletePasswordRequired"))
			: z.string().optional(),
		phrase: z
			.string()
			.trim()
			.refine((value) => value === ACCOUNT_DELETE_CONFIRMATION_PHRASE, {
				message: t("account.validation.deletePhraseMismatch"),
			}),
		username: z
			.string()
			.trim()
			.refine((value) => value === expectedUsername, {
				message: t("account.validation.deleteUsernameMismatch"),
			}),
	});

export type ChangeEmailFormValues = z.infer<ReturnType<typeof createChangeEmailSchema>>;
export type ChangePasswordFormValues = z.infer<ReturnType<typeof createChangePasswordSchema>>;
export type DisplayNameFormValues = z.infer<ReturnType<typeof createDisplayNameSchema>>;
export type SetPasswordFormValues = z.infer<ReturnType<typeof createSetPasswordSchema>>;
export type UsernameFormValues = z.infer<ReturnType<typeof createUsernameSchema>>;

export interface DeleteAccountFormValues {
	password?: string;
	phrase: string;
	username: string;
}
