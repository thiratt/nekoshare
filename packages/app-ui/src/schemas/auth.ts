import { z } from "zod";

export const loginFormSchema = z.object({
	identifier: z
		.string({ required_error: "Email or username is required." })
		.trim()
		.refine(
			(val) => {
				const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
				const isUsername = /^[a-zA-Z0-9_.-]+$/.test(val);
				return isEmail || isUsername;
			},
			{ message: "Please enter a valid email address or username." }
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
			(val) => {
				const value = val?.toString() || "";
				if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length > 100) {
					return { message: "Email must be at most 100 characters long." };
				}
				if (/^[a-zA-Z0-9_.-]+$/.test(value)) {
					if (value.length < 3) {
						return { message: "Username must be at least 3 characters long." };
					}
					if (value.length > 30) {
						return { message: "Username must be at most 20 characters long." };
					}
				}
				return { message: "Invalid identifier." };
			}
		),
	password: z
		.string({ required_error: "Password is required." })
		.min(8, "Password must be at least 8 characters long.")
		.max(16, "Password must be no more than 16 characters long."),
});

export const signupFormSchema = z
	.object({
		username: z.string().min(2, { message: "Username must be at least 2 characters long." }),
		email: z.string().email({ message: "Please enter a valid email address." }).trim(),
		password: z
			.string()
			.min(8, { message: "Password must be at least 8 characters long." })
			.max(16, { message: "Password must be at most 16 characters long." }),
		confirmPassword: z
			.string()
			.min(8, { message: "Confirm Password must be at least 8 characters long." })
			.max(16, { message: "Confirm Password must be at most 16 characters long." }),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match.",
	});

export const resetPasswordFormSchema = z.object({
	email: z.string().email({ message: "Please enter a valid email address." }).trim(),
});
