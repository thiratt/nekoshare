import { memo } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";

import { useAppI18n } from "@workspace/i18n/react";

interface LogoutDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

export const LogoutDialog = memo(function LogoutDialog({ open, onOpenChange, onConfirm }: LogoutDialogProps) {
	const { t } = useAppI18n();

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("settings.logout.title")}</AlertDialogTitle>
					<AlertDialogDescription>{t("settings.logout.description")}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>{t("common.actions.signOut")}</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
});

interface UnsavedChangesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDiscard: () => void;
}

export const UnsavedChangesDialog = memo(function UnsavedChangesDialog({
	open,
	onOpenChange,
	onDiscard,
}: UnsavedChangesDialogProps) {
	const { t } = useAppI18n();

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("settings.unsaved.title")}</AlertDialogTitle>
					<AlertDialogDescription>{t("settings.unsaved.description")}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("settings.unsaved.stay")}</AlertDialogCancel>
					<AlertDialogAction onClick={onDiscard}>{t("settings.unsaved.discard")}</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
});
