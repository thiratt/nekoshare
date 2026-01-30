import * as React from "react";

import { LucideCheck } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";

interface GlassButtonProps extends React.ComponentProps<"button"> {
	children: string;
	selected?: boolean;
	sublabel?: string;
	icon?: React.ReactNode;
	avatar?: string;
	avatarFallback?: string;
	orientation?: "horizontal" | "vertical";
	withCheck?: boolean;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
	(
		{
			children,
			className,
			selected,
			sublabel,
			icon,
			avatar,
			avatarFallback = "U",
			orientation = "horizontal",
			withCheck = false,
			onClick,
			...props
		},
		ref,
	) => {
		return (
			<button
				ref={ref}
				onClick={onClick}
				type="button"
				className={cn(
					"flex w-full items-center gap-2 rounded-xl border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/20",
					"disabled:cursor-not-allowed disabled:opacity-50",
					orientation === "vertical" ? "flex-col" : "flex-row",
					selected
						? "border-white/30 bg-white/15"
						: "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8",
					className,
				)}
				{...props}
			>
				{icon && (
					<div
						className={cn(
							"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
							selected ? "bg-white text-black" : "bg-white/10 text-white/60",
						)}
					>
						{icon}
					</div>
				)}

				{!icon && avatar !== undefined && (
					<Avatar className="h-9 w-9 shrink-0 border border-white/10">
						{avatar && <AvatarImage src={avatar} alt={children} />}
						<AvatarFallback className="bg-white/10 text-xs text-white">{avatarFallback}</AvatarFallback>
					</Avatar>
				)}

				<div className={cn("min-w-0 flex-1", orientation === "vertical" ? "text-center" : "")}>
					<p className={cn("font-medium transition-colors", selected ? "text-white" : "text-white/80")}>
						{children}
					</p>
					{sublabel && <p className="text-sm text-white/60 truncate">{sublabel}</p>}
				</div>

				{selected && withCheck && (
					<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white animate-in fade-in zoom-in">
						<LucideCheck className="h-3 w-3 text-black" />
					</div>
				)}
			</button>
		);
	},
);

GlassButton.displayName = "GlassButton";

export { GlassButton };
