import { AnimatePresence, motion } from "motion/react";
import type { HTMLMotionProps, Variants } from "motion/react";

const defaultVariants: Variants = {
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
