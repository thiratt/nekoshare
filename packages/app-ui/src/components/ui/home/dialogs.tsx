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
import { buttonVariants } from "@workspace/ui/components/button";

interface DeleteItemDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

interface DeleteBulkDialogProps {
	open: boolean;
	itemCount: number;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

export const DeleteItemDialog = memo(function DeleteItemDialog({
	open,
	onOpenChange,
	onConfirm,
}: DeleteItemDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
					<AlertDialogDescription>
						คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={onConfirm}>
						ลบ
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
});

export const DeleteBulkDialog = memo(function DeleteBulkDialog({
	open,
	itemCount,
	onOpenChange,
	onConfirm,
}: DeleteBulkDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ยืนยันการลบหลายรายการ</AlertDialogTitle>
					<AlertDialogDescription>
						คุณแน่ใจหรือไม่ว่าต้องการลบ {itemCount} รายการที่เลือก? การดำเนินการนี้ไม่สามารถย้อนกลับได้.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={onConfirm}>
						ลบ {itemCount} รายการ
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
});
