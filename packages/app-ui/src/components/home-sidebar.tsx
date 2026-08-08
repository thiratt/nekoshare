import { type ComponentType, useMemo } from "react";

import { LuHouse, LuMonitorSmartphone, LuSettings, LuUsers } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { AppLink } from "@workspace/app-ui/components/app-link";
import { useSidebar } from "@workspace/app-ui/hooks/use-sidebar";

import { useAppI18n } from "@workspace/i18n/react";

interface HomeSidebarProps {
	pathname: string;
	mode?: "desktop" | "website";
	onSettings?: () => void;
	onNotifications?: () => void;
	onSignout?: () => Promise<void>;
	collapseWhenNotificationOpen?: boolean;
	isOpen?: boolean;
}

interface SidebarButtonProps {
	label: string;
	icon: ComponentType<{ className?: string }>;
	link?: string;
	isActive?: boolean;
	isOpen: boolean;
	onClick?: () => void;
}

function SidebarButton({ label, icon: Icon, link, isActive = false, isOpen, onClick }: SidebarButtonProps) {
	const contents = (
		<>
			<Icon className="size-4 shrink-0" />

			<span
				className={cn(
					"min-w-0 overflow-hidden whitespace-nowrap text-left",
					"transition-[max-width,margin,opacity,transform]",
					"duration-200 ease-out",
					isOpen ? "ml-2 max-w-40 translate-x-0 opacity-100" : "ml-0 max-w-0 -translate-x-1 opacity-0",
				)}
			>
				{label}
			</span>
		</>
	);

	const button = (
		<Button
			type="button"
			variant="ghost"
			aria-label={isOpen ? undefined : label}
			aria-current={isActive ? "page" : undefined}
			className={cn(
				"h-9 w-full justify-start gap-0 overflow-hidden px-2",
				"transition-colors duration-150",
				"hover:bg-primary/20",
				isActive && "bg-primary/20 hover:bg-primary/20 hover:text-accent-foreground dark:hover:bg-primary/20",
			)}
			asChild={Boolean(link)}
			onClick={link ? undefined : onClick}
		>
			{link ? (
				<AppLink href={link} asButton className="cursor-default">
					{contents}
				</AppLink>
			) : (
				contents
			)}
		</Button>
	);

	return (
		<Tooltip delayDuration={200}>
			<TooltipTrigger asChild>{button}</TooltipTrigger>

			{!isOpen && (
				<TooltipContent side="right" className="font-medium">
					{label}
				</TooltipContent>
			)}
		</Tooltip>
	);
}

export function HomeSidebar({
	pathname,
	collapseWhenNotificationOpen = false,
	isOpen: controlledIsOpen,
	onSettings,
}: HomeSidebarProps) {
	const { t } = useAppI18n();
	const { isOpen: uncontrolledIsOpen } = useSidebar();

	const effectiveIsOpen = collapseWhenNotificationOpen ? false : (controlledIsOpen ?? uncontrolledIsOpen);

	const sidebarLinks = useMemo(
		() => [
			{
				id: "home",
				label: t("common.navigation.home"),
				link: "/home",
				icon: LuHouse,
			},
			{
				id: "devices",
				label: t("common.navigation.devices"),
				link: "/home/devices",
				icon: LuMonitorSmartphone,
			},
			{
				id: "friends",
				label: t("common.navigation.friends"),
				link: "/home/friends",
				icon: LuUsers,
			},
		],
		[t],
	);

	const normalizedPath = useMemo(() => {
		const segments = pathname.split("/");
		const markerIndex = segments.lastIndexOf("m");

		if (markerIndex > 0 && markerIndex === segments.length - 2) {
			segments.splice(markerIndex);
		}

		return segments.join("/") || "/";
	}, [pathname]);

	return (
		<aside
			data-open={effectiveIsOpen}
			className={cn(
				"relative flex shrink-0 flex-col overflow-hidden",
				"border-r bg-muted/20 p-2 shadow-sm",
				"transition-[width] duration-200 ease-out",
				effectiveIsOpen ? "w-52" : "w-14",
			)}
		>
			<nav className="min-w-0 space-y-0.5">
				{sidebarLinks.map((item) => {
					const isSelected =
						item.link === "/home"
							? normalizedPath === item.link
							: normalizedPath === item.link || normalizedPath.startsWith(`${item.link}/`);

					return (
						<SidebarButton
							key={item.id}
							label={item.label}
							icon={item.icon}
							link={item.link}
							isActive={isSelected}
							isOpen={effectiveIsOpen}
						/>
					);
				})}
			</nav>

			<div className="mt-auto min-w-0">
				<SidebarButton
					label="Settings"
					icon={LuSettings}
					isOpen={effectiveIsOpen}
					onClick={() => {
						void onSettings?.();
					}}
				/>
			</div>
		</aside>
	);
}
