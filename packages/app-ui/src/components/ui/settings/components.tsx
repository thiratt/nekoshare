import { memo, type ReactNode, useCallback } from "react";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";

import type { SettingCategory, SettingCategoryConfig } from "@workspace/app-ui/types/settings";

interface CategoryButtonProps {
	category: SettingCategoryConfig;
	isActive: boolean;
	onClick: (id: SettingCategory) => void;
}

interface SettingCardProps {
	title: string;
	description?: string;
	footer?: ReactNode;
	footerNote?: string;
	action?: ReactNode;
	variant?: "default" | "destructive";
	children?: ReactNode;
}

interface SettingSwitchProps {
	label: string;
	description?: string;
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	disabled?: boolean;
}

interface ShortcutRowProps {
	label: string;
	shortcut: string;
}

interface SettingSectionProps {
	children: ReactNode;
	showSeparator?: boolean;
}

export const CategoryButton = memo(function CategoryButton({ category, isActive, onClick }: CategoryButtonProps) {
	const Icon = category.icon;
	const handleClick = useCallback(() => onClick(category.id), [onClick, category.id]);

	return (
		<Button
			variant={isActive ? "default" : "ghost"}
			className="w-full justify-start gap-2"
			onClick={handleClick}
			aria-pressed={isActive}
		>
			<Icon aria-hidden />
			{category.label}
		</Button>
	);
});

export const SettingCard = memo(function SettingCard({
	title,
	description,
	footer,
	footerNote,
	action,
	variant = "default",
	children,
}: SettingCardProps) {
	return (
		<Card className={cn(variant === "destructive" && "bg-destructive/5 dark:bg-destructive/20")}>
			<CardHeader className={cn(variant === "destructive" && "text-destructive")}>
				<CardTitle>{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			{children && <CardContent>{children}</CardContent>}
			{(footerNote || action || footer) && (
				<CardFooter className="justify-between">
					{footerNote && <p className="text-sm text-muted-foreground">{footerNote}</p>}
					{footer}
					{action}
				</CardFooter>
			)}
		</Card>
	);
});

export const SettingSwitch = memo(function SettingSwitch({
	label,
	description,
	checked,
	onCheckedChange,
	disabled,
}: SettingSwitchProps) {
	return (
		<div className="flex items-center justify-between">
			<div className="space-y-0.5">
				<Label>{label}</Label>
				{description && <p className="text-sm text-muted-foreground">{description}</p>}
			</div>
			<Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
		</div>
	);
});

export const ShortcutRow = memo(function ShortcutRow({ label, shortcut }: ShortcutRowProps) {
	return (
		<div className="flex justify-between items-center">
			<span>{label}</span>
			<kbd className="px-2 py-1 text-xs bg-muted rounded">{shortcut}</kbd>
		</div>
	);
});

export const SettingSection = memo(function SettingSection({ children, showSeparator = false }: SettingSectionProps) {
	return (
		<>
			{children}
			{showSeparator && <Separator />}
		</>
	);
});

export const TAB_ANIMATION_CLASSES = cn(
	"data-[state='active']:animate-in data-[state='active']:fade-in data-[state='active']:zoom-in-[.97] data-[state='active']:slide-in-from-bottom-6 data-[state='active']:duration-300",
	"data-[state='inactive']:animate-out data-[state='inactive']:fade-out data-[state='inactive']:zoom-out-[.97] data-[state='inactive']:slide-out-to-bottom-6 data-[state='inactive']:duration-100"
);
