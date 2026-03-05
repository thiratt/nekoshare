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
	onDeleteHistoryOnly: () => void;
	onDeleteBoth: () => void;
}

interface DeleteBulkDialogProps {
	open: boolean;
	itemCount: number;
	onOpenChange: (open: boolean) => void;
	onDeleteHistoryOnly: () => void;
	onDeleteBoth: () => void;
}

export const DeleteItemDialog = memo(function DeleteItemDialog({
	open,
	onOpenChange,
	onDeleteHistoryOnly,
	onDeleteBoth,
}: DeleteItemDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
					<AlertDialogDescription>
						เลือกรูปแบบการลบ: ลบเฉพาะประวัติ หรือ ลบทั้งประวัติและไฟล์
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction
						className={buttonVariants({ variant: "outline" })}
						onClick={onDeleteHistoryOnly}
					>
						ลบแค่ประวัติ
					</AlertDialogAction>
					<AlertDialogAction
						className={buttonVariants({ variant: "destructive" })}
						onClick={onDeleteBoth}
					>
						ลบทั้งสอง
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
	onDeleteHistoryOnly,
	onDeleteBoth,
}: DeleteBulkDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ยืนยันการลบหลายรายการ</AlertDialogTitle>
					<AlertDialogDescription>
						เลือกรูปแบบการลบสำหรับ {itemCount} รายการที่เลือก
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction
						className={buttonVariants({ variant: "outline" })}
						onClick={onDeleteHistoryOnly}
					>
						ลบแค่ประวัติ
					</AlertDialogAction>
					<AlertDialogAction
						className={buttonVariants({ variant: "destructive" })}
						onClick={onDeleteBoth}
					>
						ลบทั้งสอง ({itemCount})
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
});
