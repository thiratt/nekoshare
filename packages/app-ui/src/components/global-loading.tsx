import { motion } from "motion/react";

import { cn } from "@workspace/ui/lib/utils";

export default function LoadingOverlay() {
	const numSquares = 8;
	const delayIncrement = 1.4285714285;
	return (
		<motion.div
			data-tauri-drag-region
			className={cn("flex fixed top-0 h-screen w-screen bg-background justify-center items-center z-60")}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.1, ease: "easeInOut" }}
		>
			<div className="relative w-24 h-24 transform rotate-45 pointer-events-none">
				{Array.from({ length: numSquares }).map((_, i) => (
					<div
						key={i}
						className="absolute bg-primary bg-cover bg-center bg-fixed top-0 left-0 w-7 h-7 animate-square-animation"
						style={{ animationDelay: `-${i * delayIncrement}s` }}
					></div>
				))}
			</div>
		</motion.div>
	);
}
