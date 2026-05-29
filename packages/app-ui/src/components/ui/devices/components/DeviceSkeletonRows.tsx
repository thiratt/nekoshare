export function DeviceSkeletonRows() {
	return (
		<div className="space-y-2">
			{Array.from({ length: 4 }).map((_, index) => (
				<div key={index} className="flex animate-pulse items-center gap-4 rounded-2xl border bg-card px-4 py-3">
					<div className="size-10 rounded-xl bg-muted" />
					<div className="min-w-0 flex-1 space-y-2">
						<div className="h-4 w-36 rounded bg-muted" />
						<div className="h-3 w-64 rounded bg-muted" />
					</div>
				</div>
			))}
		</div>
	);
}
