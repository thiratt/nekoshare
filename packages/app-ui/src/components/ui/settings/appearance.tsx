import { memo, useCallback, type FC, type ReactNode } from "react";
import { LuCheck, LuMonitorSmartphone, LuMoon, LuSun } from "react-icons/lu";
import type { IconType } from "react-icons";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { useTheme } from "@workspace/app-ui/providers/theme-provider";

type Theme = "dark" | "light" | "system";

interface ThemeOption {
	id: Theme;
	icon: IconType;
	bgClass: string;
	iconClass: string;
	label: string;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
	{
		id: "light",
		icon: LuSun,
		bgClass: "bg-white",
		iconClass: "text-black",
		label: "Light theme",
	},
	{
		id: "dark",
		icon: LuMoon,
		bgClass: "bg-black",
		iconClass: "text-white group-hover:-rotate-90",
		label: "Dark theme",
	},
	{
		id: "system",
		icon: LuMonitorSmartphone,
		bgClass: "bg-background",
		iconClass: "group-hover:rotate-none group-hover:scale-125",
		label: "System theme",
	},
] as const;

const CheckIndicator = memo(function CheckIndicator() {
	return (
		<div
			className="absolute top-0 right-0 flex items-center justify-center bg-foreground rounded-full text-background p-[3px] animate-in zoom-in"
			aria-hidden="true"
		>
			<LuCheck size={16} />
		</div>
	);
});

interface IconElementProps {
	className?: string;
	children: ReactNode;
}

const IconElement: FC<IconElementProps> = memo(function IconElement({ className, children }) {
	return (
		<div
			className={cn(
				"absolute inset-0 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300",
				className
			)}
			aria-hidden="true"
		>
			{children}
		</div>
	);
});

interface ThemeButtonProps {
	option: ThemeOption;
	isSelected: boolean;
	onThemeSelect: (theme: Theme) => void;
	className?: string;
	role?: string;
	"aria-checked"?: boolean;
}

const ThemeButton = memo<ThemeButtonProps>(function ThemeButton({
	option,
	isSelected,
	onThemeSelect,
	className,
	...props
}) {
	const { id, icon: Icon, bgClass, iconClass, label } = option;

	const handleClick = useCallback(() => {
		onThemeSelect(id);
	}, [onThemeSelect, id]);

	return (
		<button
			type="button"
			className={cn(
				"group cursor-pointer relative w-16 h-16 border-2 border-foreground rounded-full transition-all",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				bgClass,
				className
			)}
			onClick={handleClick}
			aria-label={label}
			aria-pressed={isSelected}
			{...props}
		>
			<IconElement className={iconClass}>
				<Icon />
			</IconElement>
			{isSelected && <CheckIndicator />}
		</button>
	);
});

export const SettingAppearanceContent = memo(function SettingAppearanceContent() {
	const { theme, setTheme } = useTheme();

	const handleThemeChange = useCallback(
		(newTheme: Theme) => {
			setTheme(newTheme);
		},
		[setTheme]
	);

	const handleSave = useCallback(() => {
		// TODO: Theme is already saved via setTheme, this could trigger additional actions
		// like showing a toast notification or syncing to server
	}, []);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>ธีม</CardTitle>
					<CardDescription>ปรับแต่งธีมแอปให้ดูดีในแบบที่คุณชอบ</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<div className="flex gap-2" role="radiogroup" aria-label="Theme selection">
						{THEME_OPTIONS.map((option) => (
							<ThemeButton
								key={option.id}
								option={option}
								isSelected={theme === option.id}
								onThemeSelect={handleThemeChange}
								role="radio"
								aria-checked={theme === option.id}
							/>
						))}
					</div>
				</CardContent>
				<CardFooter className="ms-auto">
					<Button onClick={handleSave}>บันทึก</Button>
				</CardFooter>
			</Card>
		</div>
	);
});
