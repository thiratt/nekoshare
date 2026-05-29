import { useCallback, useState } from "react";

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
import { buttonVariants } from "@workspace/ui/components/button";

type DeleteDeviceDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
};

export function DeleteDeviceDialog({ onConfirm, onOpenChange, open }: DeleteDeviceDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleConfirm = useCallback(async () => {
		setIsDeleting(true);
		try {
			await onConfirm();
			onOpenChange(false);
		} catch (error) {
			console.error("Failed to delete device:", error);
		} finally {
			setIsDeleting(false);
		}
	}, [onConfirm, onOpenChange]);

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ลบอุปกรณ์นี้</AlertDialogTitle>
					<AlertDialogDescription>
						แน่ใจนะว่าจะลบอุปกรณ์นี้? หลังจากลบแล้ว อุปกรณ์นี้จะถูกออกจากระบบอัตโนมัติ และไม่สามารถยกเลิกได้
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction
						className={buttonVariants({ variant: "destructive" })}
						onClick={handleConfirm}
						disabled={isDeleting}
					>
						{isDeleting ? "กำลังลบ..." : "ใช่ ลบเลย"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
