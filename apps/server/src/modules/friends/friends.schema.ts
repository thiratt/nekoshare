import { z } from "zod";

export const friendRequestSchema = z.object({
	userId: z.string().min(1).optional(),
	email: z.string().email().optional(),
});

export type FriendRequestInput = z.infer<typeof friendRequestSchema>;
