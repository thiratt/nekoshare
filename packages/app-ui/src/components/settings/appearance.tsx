import { useCallback, useState } from "react";

import { MonitorSmartphone, Check, Moon, Sun } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

interface SettingAppearanceContentProps {
	theme: "light" | "dark" | "system";
	setTheme: (theme: "light" | "dark" | "system") => void;
}

function DefaultThemeButton({ className = "", children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			className={cn(
				"group cursor-pointer relative w-16 h-16 border-2 border-foreground rounded-full transition-all",
				className
			)}
			{...props}
		>
			{children}
		</button>
	);
}

function IconElement({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"absolute inset-0 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300",
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
}

export function SettingAppearanceContent({ theme, setTheme }: SettingAppearanceContentProps) {
	const [internalTheme, setInternalTheme] = useState<"light" | "dark" | "system">(theme);

	const changeTheme = useCallback((theme: "light" | "dark" | "system") => {
		setTheme(theme);
		setInternalTheme(theme);
	}, []);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>ธีม</CardTitle>
					<CardDescription>ปรับแต่งธีมแอปให้ดูดีในแบบที่คุณชอบ</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<div className="flex gap-2">
						<DefaultThemeButton className="bg-white" onClick={() => changeTheme("light")}>
							<IconElement className="text-black">
								<Sun />
							</IconElement>
							{internalTheme === "light" && (
								<div className="absolute top-0 right-0 flex items-center justify-center bg-foreground rounded-full text-background p-[3px] animate-in zoom-in">
									<Check size={16} />
								</div>
							)}
						</DefaultThemeButton>
						<DefaultThemeButton className="bg-black" onClick={() => changeTheme("dark")}>
							<IconElement className="text-white group-hover:-rotate-90">
								<Moon />
							</IconElement>
							{internalTheme === "dark" && (
								<div className="absolute top-0 right-0 flex items-center justify-center bg-foreground rounded-full text-background p-[3px] animate-in zoom-in">
									<Check size={16} />
								</div>
							)}
						</DefaultThemeButton>
						<DefaultThemeButton className="bg-background" onClick={() => changeTheme("system")}>
							<IconElement className="group-hover:rotate-none group-hover:scale-125">
								<MonitorSmartphone />
							</IconElement>
							{internalTheme === "system" && (
								<div className="absolute top-0 right-0 flex items-center justify-center bg-foreground rounded-full text-background p-[3px] animate-in zoom-in">
									<Check size={16} />
								</div>
							)}
						</DefaultThemeButton>
					</div>
				</CardContent>
				<CardFooter className="ms-auto">
					<Button>บันทึก</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
