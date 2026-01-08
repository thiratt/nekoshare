import { cn } from "@workspace/ui/lib/utils";

import type { ExtendLinkProps } from "@workspace/app-ui/types/link";

export function ExtendLink({
	href,
	className,
	linkComponent: LinkComponent,
	children,
	enableTransition = true,
	asButton,
	...props
}: ExtendLinkProps) {
	return (
		<LinkComponent
			to={href}
			className={cn(
				!asButton &&
					"underline underline-offset-[5px] transition-all duration-200 hover:underline hover:underline-offset-2 hover:text-primary",
				className
			)}
			{...(enableTransition ? { viewTransition: { types: [] } } : {})}
			{...props}
		>
			{children}
		</LinkComponent>
	);
}
