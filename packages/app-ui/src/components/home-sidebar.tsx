import {
	Home as HomeIcon,
	ChevronLeft,
	Clock,
	GalleryVerticalEnd,
	Package2,
	MonitorSmartphone,
	Bell,
	CreditCard,
	LogOut,
	Sparkles,
	Trash2,
	Settings,
} from "lucide-react";

import { RiUserShared2Line } from "react-icons/ri";

import { useSidebar } from "@workspace/app-ui/hooks/use-sidebar";

import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { ExtendLink } from "./link";
import { IncludeLinkComponentProps } from "../types";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useMemo } from "react";

const sidebarLink = [
	{
		label: "หน้าหลัก",
		link: "/home",
		icon: HomeIcon,
	},
	{
		label: "ข้อความและไฟล์",
		link: "/home/content",
		icon: Package2,
	},
	{
		label: "อุปกรณ์",
		link: "/home/devices",
		icon: MonitorSmartphone,
	},
	{
		label: "รายการย้อนหลัง",
		link: "/home/items",
		icon: GalleryVerticalEnd,
	},
	{
		label: "Buddy Share",
		link: "/home/buddy-share",
		icon: RiUserShared2Line,
	},
	{
		label: "ประวัติการแชร์",
		link: "/home/history",
		icon: Clock,
	},
	{
		label: "ถังขยะ",
		link: "/home/trash",
		icon: Trash2,
	},
];

interface HomeSidebarProps extends IncludeLinkComponentProps {
	pathname: string;
	onSettings: () => Promise<void>;
	onNavigations: () => void;
	onSignout: () => Promise<void>;
}

export function HomeSidebar({ pathname, linkComponent, onNavigations, onSettings, onSignout }: HomeSidebarProps) {
	const { isOpen, toggleSidebar } = useSidebar();

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
			<div
				className={cn(
					"relative flex flex-col py-4 border-r duration-300",
					isOpen ? "w-52 xl:w-64 px-3" : "w-16 px-2"
				)}
			>
				<nav className="flex-1 flex flex-col">
					<div className={cn("flex items-center transition-[margin] mb-4", !isOpen && "ms-2")}>
						<Button size="icon" onClick={toggleSidebar} className="h-8 w-8 rounded-full">
							<ChevronLeft className={cn("", isOpen ? "rotate-180" : "rotate-0")} />
						</Button>
						{isOpen && <h3 className="ms-2 font-bold text-xl truncate">NekoShare</h3>}
					</div>
					<div className="space-y-1">
						{sidebarLink.map((item) => {
							// const subpath = pathname.split("/");
							const isActive = normalizePath === item.link;
							const translatedLabel = item.label;

							const buttonContent = (
								<Button
									variant={isActive ? "default" : "ghost"}
									className="w-full h-10 justify-start"
									asChild
								>
									<ExtendLink href={item.link} linkComponent={linkComponent} asButton>
										<div className="flex items-center gap-3">
											<item.icon size={20} />
										</div>
										{isOpen && <span className="truncate">{translatedLabel}</span>}
									</ExtendLink>
								</Button>
							);

							if (!isOpen) {
								return (
									<Tooltip key={item.link}>
										<TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
										<TooltipContent side="right" className="font-medium">
											{translatedLabel}
										</TooltipContent>
									</Tooltip>
								);
							}

							return <div key={item.link}>{buttonContent}</div>;
						})}
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								className="px-1 justify-start h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								variant="ghost"
								disableScale
								asChild
							>
								<div className="mt-auto">
									<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
										<Avatar className="h-8 w-8 rounded-lg">
											<AvatarImage src="https://github.com/evilrabbit.png" alt="Thiratcha" />
											<AvatarFallback className="rounded-lg">TM</AvatarFallback>
										</Avatar>
										{isOpen && (
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
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem>
									<Sparkles />
									Upgrade to Pro
								</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem onClick={onSettings}>
									<Settings />
									Settings
								</DropdownMenuItem>
								<DropdownMenuItem>
									<CreditCard />
									Billing
								</DropdownMenuItem>
								<DropdownMenuItem onClick={onNavigations}>
									<Bell />
									Notifications
								</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<div onClick={onSignout}>
									<LogOut />
									Log out
								</div>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</nav>
			</div>
		</TooltipProvider>
	);
}
