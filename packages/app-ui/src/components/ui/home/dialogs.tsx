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
import { Button, buttonVariants } from "@workspace/ui/components/button";

interface DeleteItemDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDeleteHistoryOnly: () => void;
	onDeleteBoth: () => void;
	allowDeleteBoth?: boolean;
}

interface DeleteBulkDialogProps {
	open: boolean;
	itemCount: number;
	onOpenChange: (open: boolean) => void;
	onDeleteHistoryOnly: () => void;
	onDeleteBoth: () => void;
	allowDeleteBoth?: boolean;
}

export const DeleteItemDialog = memo(function DeleteItemDialog({
	open,
	onOpenChange,
	onDeleteHistoryOnly,
	onDeleteBoth,
	allowDeleteBoth = true,
}: DeleteItemDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
					<AlertDialogDescription>
						{allowDeleteBoth
							? "เลือกรูปแบบการลบ: ลบเฉพาะประวัติ หรือ ลบทั้งประวัติและไฟล์"
							: "รายการที่กำลังส่ง ลบได้เฉพาะประวัติเท่านั้น"}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
					<Button onClick={onDeleteHistoryOnly}>ลบแค่ประวัติ</Button>
					{allowDeleteBoth && (
						<AlertDialogAction
							className={buttonVariants({ variant: "destructive" })}
							onClick={onDeleteBoth}
						>
							ลบทั้งสอง
						</AlertDialogAction>
					)}
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
	allowDeleteBoth = true,
}: DeleteBulkDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ยืนยันการลบหลายรายการ</AlertDialogTitle>
					<AlertDialogDescription>
						{allowDeleteBoth
							? `เลือกรูปแบบการลบสำหรับ ${itemCount} รายการที่เลือก`
							: `รายการที่เลือกเป็นการส่งทั้งหมด ลบได้เฉพาะประวัติ (${itemCount} รายการ)`}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
					<Button onClick={onDeleteHistoryOnly}>ลบแค่ประวัติ</Button>
					{allowDeleteBoth && (
						<AlertDialogAction
							className={buttonVariants({ variant: "destructive" })}
							onClick={onDeleteBoth}
						>
							ลบทั้งสอง ({itemCount})
						</AlertDialogAction>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
});
