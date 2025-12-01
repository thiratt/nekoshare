import { z } from "zod";

export const loginFormSchema = z.object({
	identifier: z
		.string({ required_error: "อีเมลหรือชื่อผู้ใช้ไม่สามารถเว้นว่างได้" })
		.trim()
		.refine(
			(val) => {
				const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
				const isUsername = /^[a-zA-Z0-9_.-]+$/.test(val);
				return isEmail || isUsername;
			},
			{ message: "กรุณาใส่อีเมลหรือชื่อผู้ใช้ที่ถูกต้อง" }
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
					return { message: "อีเมลต้องมีความยาวไม่เกิน 100 ตัวอักษร" };
				}
				if (/^[a-zA-Z0-9_.-]+$/.test(value)) {
					if (value.length < 2) {
						return { message: "ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 2 ตัวอักษร" };
					}
					if (value.length > 20) {
						return { message: "ชื่อผู้ใช้ต้องมีความยาวไม่เกิน 20 ตัวอักษร" };
					}
				}
				return { message: "อีเมลหรือชื่อผู้ใช้ไม่ถูกต้อง" };
			}
		),
	password: z
		.string({ required_error: "รหัสผ่านไม่สามารถเว้นว่างได้" })
		.min(8, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร")
		.max(16, "รหัสผ่านต้องมีความยาวไม่เกิน 16 ตัวอักษร"),
});

export const signupFormSchema = z
	.object({
		username: z.string().min(2, { message: "ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 2 ตัวอักษร" }),
		email: z.string().email({ message: "รูปแบบอีเมลไม่ถูกต้อง" }).trim(),
		password: z
			.string()
			.min(8, { message: "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร" })
			.max(16, { message: "รหัสผ่านต้องมีความยาวไม่เกิน 16 ตัวอักษร" }),
		confirmPassword: z
			.string()
			.min(8, { message: "ยืนยันรหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร" })
			.max(16, { message: "ยืนยันรหัสผ่านต้องมีความยาวไม่เกิน 16 ตัวอักษร" }),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "รหัสผ่านไม่ตรงกัน",
	});

export const resetPasswordFormSchema = z.object({
	email: z.string().email({ message: "รูปแบบอีเมลไม่ถูกต้อง" }).trim(),
});
