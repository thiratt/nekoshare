import type { GlobalOptions } from "./types";

export const DEFAULT_GLOBAL_OPTIONS: GlobalOptions = {
	encrypt: false,
	compress: true,
	public: false,
	password: "",
	expiration: "1d",
} as const;

export const SPRING_CONFIG = {
	stiffness: 500,
	damping: 40,
} as const;

export const SPRING_CONFIG_SOFT = {
	stiffness: 400,
	damping: 35,
	mass: 0.5,
} as const;

export const SPRING_CONFIG_FAST = {
	stiffness: 400,
	damping: 30,
} as const;

export const TRANSITION_SMOOTH = {
	duration: 0.2,
	ease: [0.4, 0, 0.2, 1],
} as const;

export const TRANSITION_SPRING = {
	type: "spring" as const,
	...SPRING_CONFIG,
};

export const TRANSITION_SPRING_SOFT = {
	type: "spring" as const,
	...SPRING_CONFIG_SOFT,
};

export const POSITION_THROTTLE_MS = 16;

export const EXPIRATION_OPTIONS = [
	{ value: "15m", label: "15 Minutes" },
	{ value: "30m", label: "30 Minutes" },
	{ value: "1h", label: "1 Hour" },
	{ value: "1d", label: "1 Day" },
] as const;
