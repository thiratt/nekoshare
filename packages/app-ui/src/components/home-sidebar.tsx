import { useMemo } from "react";

import { LuChevronLeft, LuHouse, LuLogOut, LuMonitorSmartphone, LuUsers } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { useSidebar } from "@workspace/app-ui/hooks/use-sidebar";

import { ExtendLink } from "@workspace/app-ui/components/ext/link";
import type { IncludeLinkComponentProps } from "@workspace/app-ui/types/link";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";

interface HomeSidebarProps extends IncludeLinkComponentProps {
	pathname: string;
	mode?: "desktop" | "website";
	onSettings?: () => Promise<void>;
	onNotifications?: () => void;
	onSignout?: () => Promise<void>;
	collapseWhenNotificationOpen?: boolean;
}

interface SidebarButtonProps {
	label: string;
	link: string;
	icon: React.ElementType;
	isActive: boolean;
	isOpen: boolean;
	linkComponent: any;
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
	mode = "website",
	onSignout,
	collapseWhenNotificationOpen = false,
}: HomeSidebarProps) {
	const { isOpen, toggleSidebar } = useSidebar();
	const { setMode, toggleNotification } = useNekoShare();

	// Force collapse when notification sidebar is open
	const effectiveIsOpen = collapseWhenNotificationOpen ? false : isOpen;

	const sidebarLink = useMemo(
		() => [
			{
				label: "หน้าหลัก",
				link: "/home",
				icon: LuHouse,
			},
			{
				label: "เพื่อน",
				link: "/home/friends",
				icon: LuUsers,
			},
			{
				label: "อุปกรณ์",
				link: "/home/devices",
				icon: LuMonitorSmartphone,
			},
			// {
			// 	label: "รายการย้อนหลัง",
			// 	link: "/home/items",
			// 	icon: GalleryVerticalEnd,
			// },

			// {
			// 	label: "ประวัติการแชร์",
			// 	link: "/home/history",
			// 	icon: Clock,
			// },
			// {
			// 	label: "ถังขยะ",
			// 	link: "/home/trash",
			// 	icon: Trash2,
			// },
		],
		[]
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
					"relative flex flex-col py-4 pb-12 border-r duration-300 px-4.5",
					effectiveIsOpen ? "w-52 xl:w-64" : "w-20"
				)}
			>
				{mode === "desktop" && (
					<div
						className={cn(
							"absolute flex items-center transition-[margin] -right-4",
							!effectiveIsOpen && ""
						)}
					>
						<Button
							className="h-8 w-8 rounded-full"
							size="icon"
							onClick={toggleSidebar}
							disabled={collapseWhenNotificationOpen}
						>
							<LuChevronLeft className={effectiveIsOpen ? "rotate-180" : "rotate-0"} />
						</Button>
					</div>
				)}
				<nav className="flex-1 flex flex-col">
					{mode === "website" && (
						<div className={cn("flex items-center transition-[margin] mb-4", !effectiveIsOpen && "ms-2")}>
							<Button size="icon" onClick={toggleSidebar} className="h-8 w-8 rounded-full">
								<LuChevronLeft className={effectiveIsOpen ? "rotate-180" : "rotate-0"} />
							</Button>
							{effectiveIsOpen && <h3 className="ms-2 font-bold text-xl truncate">NekoShare</h3>}
						</div>
					)}
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
					{mode === "website" && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									className="px-1 mt-auto justify-start h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
									variant="ghost"
									asChild
								>
									<div>
										<div className="flex items-center gap-2 px-0.5 py-1.5 text-left text-sm">
											<Avatar className="h-8 w-8 rounded-lg">
												<AvatarImage src="https://github.com/evilrabbit.png" alt="Thiratcha" />
												<AvatarFallback className="rounded-lg">TM</AvatarFallback>
											</Avatar>
											{effectiveIsOpen && (
												<div className="grid flex-1 text-left text-sm leading-tight">
													<span className="truncate font-medium">Thiratcha</span>
													<span className="truncate text-xs">66011212181@msu.ac.th</span>
												</div>
											)}
										</div>
									</div>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
								side="right"
								align="end"
								sideOffset={4}
							>
								<DropdownMenuLabel className="p-0 font-normal">
									<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
										<Avatar className="h-8 w-8 rounded-lg">
											<AvatarImage src="https://github.com/evilrabbit.png" alt="Thiratcha" />
											<AvatarFallback className="rounded-lg">TM</AvatarFallback>
										</Avatar>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-medium">Thiratcha</span>
											<span className="truncate text-xs">66011212181@msu.ac.th</span>
										</div>
									</div>
								</DropdownMenuLabel>
								{/* <DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem>
										<Sparkles />
										Upgrade to Pro
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem onClick={() => setMode("setting")}>
										<Settings />
										Settings
									</DropdownMenuItem>
									<DropdownMenuItem>
										<CreditCard />
										Billing
									</DropdownMenuItem>
									<DropdownMenuItem onClick={toggleNotification}>
										<Bell />
										Notifications
									</DropdownMenuItem>
								</DropdownMenuGroup> */}
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<div onClick={onSignout}>
										<LuLogOut />
										Log out
									</div>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</nav>
			</aside>
		</TooltipProvider>
	);
}
