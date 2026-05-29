type DeviceSectionProps = {
	children: React.ReactNode;
	count: number;
	title: string;
};

export function DeviceSection({ children, count, title }: DeviceSectionProps) {
	return (
		<section>
			<div className="mb-3 flex items-center justify-between">
				<h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
				<span className="text-xs tabular-nums text-muted-foreground">{count}</span>
			</div>
			<div className="space-y-2">{children}</div>
		</section>
	);
}
