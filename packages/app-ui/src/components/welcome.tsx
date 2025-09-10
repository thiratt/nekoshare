import { cn } from "@workspace/ui/lib/utils";

function Welcome({ className }: { className?: string }) {
	return (
		<div className={cn(className, "min-h-svh flex items-center justify-center")}>
			<p>Welcome to NekoShare!</p>
		</div>
	);
}

export { Welcome };
