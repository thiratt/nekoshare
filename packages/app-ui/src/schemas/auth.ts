import { z } from "zod";

import type { AppTFunction } from "@workspace/i18n/resources";

export function createLoginFormSchema(t: AppTFunction) {
	return z.object({
		identifier: z
			.string({ required_error: t("auth.validation.emailOrUsernameRequired") })
			.trim()
			.refine(
				(val) => {
					const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
					const isUsername = /^[a-zA-Z0-9_.-]+$/.test(val);
					return isEmail || isUsername;
				},
				{ message: t("auth.validation.emailOrUsernameInvalid") },
			)
			.refine(
				(val) => {
					if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
						return val.length <= 100;
					}
					if (/^[a-zA-Z0-9_.-]+$/.test(val)) {
						return val.length <= 20 && val.length >= 3;
					}
					return false;
				},
				(value) => {
					const nextValue = value?.toString() || "";
					if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextValue) && nextValue.length > 100) {
						return { message: t("auth.validation.emailTooLong") };
					}

					if (/^[a-zA-Z0-9_.-]+$/.test(nextValue)) {
						if (nextValue.length < 2) {
							return { message: t("auth.validation.usernameMin") };
						}

						if (nextValue.length > 20) {
							return { message: t("auth.validation.usernameMax") };
						}
					}

					return { message: t("auth.validation.emailOrUsernameInvalid") };
				},
			),
		password: z
			.string({ required_error: t("auth.validation.passwordRequired") })
			.min(8, t("auth.validation.passwordMin"))
			.max(16, t("auth.validation.passwordMax")),
	});
}

export function createSignupFormSchema(t: AppTFunction) {
	return z
		.object({
			username: z.string().min(2, { message: t("auth.validation.usernameMin") }),
			email: z.string().email({ message: t("auth.validation.emailInvalid") }).trim(),
			password: z
				.string()
				.min(8, { message: t("auth.validation.passwordMin") })
				.max(16, { message: t("auth.validation.passwordMax") }),
			confirmPassword: z
				.string()
				.min(8, { message: t("auth.validation.confirmPasswordMin") })
				.max(16, { message: t("auth.validation.confirmPasswordMax") }),
		})
		.refine((data) => data.password === data.confirmPassword, {
			message: t("auth.validation.passwordMismatch"),
		});
}

export function createResetPasswordFormSchema(t: AppTFunction) {
	return z.object({
		email: z.string().email({ message: t("auth.validation.emailInvalid") }).trim(),
	});
}
