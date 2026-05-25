import { useMemo } from "react";

import { LuHouse, LuMonitorSmartphone, LuUsers } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { ExtendLink } from "@workspace/app-ui/components/ext/link";
import { useSidebar } from "@workspace/app-ui/hooks/use-sidebar";
import type { IncludeLinkComponentProps, LinkComponent } from "@workspace/app-ui/types/link";

import { useAppI18n } from "@workspace/i18n/react";

interface HomeSidebarProps extends IncludeLinkComponentProps {
	pathname: string;
	mode?: "desktop" | "website";
	onSettings?: () => Promise<void>;
	onNotifications?: () => void;
	onSignout?: () => Promise<void>;
	collapseWhenNotificationOpen?: boolean;
	isOpen?: boolean;
}

interface SidebarButtonProps {
	label: string;
	link: string;
	icon: React.ElementType;
	isActive: boolean;
	isOpen: boolean;
	linkComponent: LinkComponent;
}

const SidebarButton = ({ label, link, icon: Icon, isActive, isOpen, linkComponent }: SidebarButtonProps) => {
	const content = (
		<Button variant={isActive ? "default" : "ghost"} className="w-full h-10 justify-start" asChild>
			<ExtendLink href={link} linkComponent={linkComponent} asButton>
				<Icon className={isOpen ? "ms-0" : "ms-0.5"} size={20} />
				{isOpen && <span className="truncate">{label}</span>}
			</ExtendLink>
		</Button>
	);

	if (!isOpen) {
		return (
			<Tooltip key={link}>
				<TooltipTrigger asChild>{content}</TooltipTrigger>
				<TooltipContent side="right" className="font-medium">
					{label}
				</TooltipContent>
			</Tooltip>
		);
	}

	return <div key={link}>{content}</div>;
};

export function HomeSidebar({
	linkComponent,
	pathname,
	collapseWhenNotificationOpen = false,
	isOpen: controlledIsOpen,
}: HomeSidebarProps) {
	const { t } = useAppI18n();
	const { isOpen: uncontrolledIsOpen } = useSidebar();
	const effectiveIsOpen = collapseWhenNotificationOpen ? false : (controlledIsOpen ?? uncontrolledIsOpen);

	const sidebarLink = useMemo(
		() => [
			{
				label: t("common.navigation.home"),
				link: "/home",
				icon: LuHouse,
			},
			{
				label: t("common.navigation.friends"),
				link: "/home/friends",
				icon: LuUsers,
			},
			{
				label: t("common.navigation.devices"),
				link: "/home/devices",
				icon: LuMonitorSmartphone,
			},
		],
		[t],
	);

	const normalizePath = useMemo(() => {
		const segments = pathname.split("/");
		const sIndex = segments.lastIndexOf("m");

		if (sIndex > 0 && sIndex === segments.length - 2) {
			segments.splice(sIndex);
		}

		return segments.join("/") || "/";
	}, [pathname]);

	return (
		<TooltipProvider>
			<aside
				className={cn(
					"relative flex flex-col gap-4 py-4 border-r duration-300 px-4.5",
					effectiveIsOpen ? "w-52 xl:w-64" : "w-20",
				)}
			>
				<nav className="flex-1 flex flex-col">
					<div className="space-y-1 flex flex-col">
						{sidebarLink.map((item) => (
							<SidebarButton
								key={item.link}
								label={item.label}
								link={item.link}
								icon={item.icon}
								isActive={normalizePath === item.link}
								isOpen={effectiveIsOpen}
								linkComponent={linkComponent}
							/>
						))}
					</div>
				</nav>
			</aside>
		</TooltipProvider>
	);
}
