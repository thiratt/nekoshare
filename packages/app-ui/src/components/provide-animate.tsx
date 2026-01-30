import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import type { HTMLMotionProps, Variants } from "motion/react";

export { AnimatePresence, LayoutGroup, motion };
export type { HTMLMotionProps, Variants };

export const fadeVariants: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { duration: 0.15 } },
	exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const fadeSlideUpVariants: Variants = {
	hidden: { opacity: 0, y: -10 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
	exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

export const fadeScaleVariants: Variants = {
	hidden: { opacity: 0, scale: 0.98 },
	visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
	exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15 } },
};

export const collapseVariants: Variants = {
	hidden: { opacity: 0, width: 0, scale: 0.8 },
	visible: {
		opacity: 1,
		width: "auto",
		scale: 1,
		transition: { type: "spring", bounce: 0, duration: 0.4 },
	},
	exit: {
		opacity: 0,
		width: 0,
		scale: 0.8,
		transition: { duration: 0.3, ease: "easeInOut" },
	},
};

const defaultVariants = collapseVariants;

interface AnimatedContainerProps extends HTMLMotionProps<"div"> {
	show: boolean;
	children: React.ReactNode;
	mode?: "wait" | "sync" | "popLayout";
}

export function AnimatedContainer({
	show,
	children,
	variants = defaultVariants,
	mode = "wait",
	...props
}: AnimatedContainerProps) {
	return (
		<AnimatePresence mode={mode}>
			{show && (
				<motion.div variants={variants} initial="hidden" animate="visible" exit="exit" {...props}>
					{children}
				</motion.div>
			)}
		</AnimatePresence>
	);
}
