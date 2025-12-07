import type { Transition, Variants } from "motion/react";

export const CONTENT_VARIANTS: Variants = {
	initial: { opacity: 0, y: 8 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -8 },
};

export const OVERLAY_VARIANTS: Variants = {
	initial: { opacity: 0, scale: 0.98, y: 10 },
	animate: { opacity: 1, scale: 1, y: 0 },
	exit: { opacity: 0, scale: 0.98, y: 10 },
};

export const SPRING_TRANSITION: Transition = {
	type: "spring",
	stiffness: 400,
	damping: 30,
};

export const CONTENT_TRANSITION: Transition = {
	duration: 0.15,
	ease: [0.4, 0, 0.2, 1],
};

export const OVERLAY_TRANSITION: Transition = {
	duration: 0.2,
	ease: "easeOut",
	delay: 0.1,
};
