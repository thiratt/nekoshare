import { cn } from "@workspace/ui/lib/utils";

import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import type { AppLinkProps } from "@workspace/app-ui/types/link";

export function AppLink({ href, className, children, asButton, ...props }: AppLinkProps) {
	const { linkComponent: LinkComponent } = useNekoShare();

	return (
		<LinkComponent
			to={href}
			className={cn(
				!asButton &&
					"underline underline-offset-[5px] transition-all duration-200 hover:underline hover:underline-offset-2 hover:text-primary",
				className,
			)}
			{...props}
		>
			{children}
		</LinkComponent>
	);
}
