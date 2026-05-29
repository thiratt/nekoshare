import { memo } from "react";

import { cn } from "@workspace/ui/lib/utils";

type SectionHeaderProps = {
	title: string;
	count: number;
	className?: string;
};

type FriendSectionProps = SectionHeaderProps & {
	children: React.ReactNode;
};

export const SectionHeader = memo(function SectionHeader({ className, count, title }: SectionHeaderProps) {
	return (
		<div className={cn("mb-2 flex items-center justify-between", className)}>
			<h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
			<span className="text-xs tabular-nums text-muted-foreground">{count}</span>
		</div>
	);
});

export function FriendSection({ children, count, title }: FriendSectionProps) {
	return (
		<section>
			<SectionHeader title={title} count={count} />
			<div className="space-y-2">{children}</div>
		</section>
	);
}
