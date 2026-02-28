import { z } from "zod";
import type { Os } from "@workspace/contracts/api";

const OS_TYPES = ["windows", "android", "web", "other"] as const satisfies readonly Os[];

export const deviceRegistrationSchema = z.object({
	id: z.string().min(1).max(36),
	name: z.string().min(1).max(50),
	platform: z.object({
		os: z.enum(OS_TYPES),
	}),
	fingerprint: z.string().min(1).max(128).optional(),
});

export const deviceUpdateSchema = z.object({
	name: z.string().min(1).max(50).optional(),
});

export type DeviceRegistrationInput = z.infer<typeof deviceRegistrationSchema>;
export type DeviceUpdateInput = z.infer<typeof deviceUpdateSchema>;
