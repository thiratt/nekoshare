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

import type { ShareItem } from "@workspace/app-ui/types/home";

interface DeleteItemDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
}

interface DeleteBulkDialogProps {
	open: boolean;
	items: ShareItem[];
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

export function DeleteItemDialog({ open, onOpenChange, onConfirm }: DeleteItemDialogProps) {
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
					<AlertDialogAction
						className={buttonVariants({ variant: "destructive" })}
						onClick={async () => {
							await onConfirm();
						}}
					>
						ลบ
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function DeleteBulkDialog({ open, items, onOpenChange, onConfirm }: DeleteBulkDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ยืนยันการลบหลายรายการ</AlertDialogTitle>
					<AlertDialogDescription>
						คุณแน่ใจหรือไม่ว่าต้องการลบ {items.length} รายการที่เลือก? การดำเนินการนี้ไม่สามารถย้อนกลับได้.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={onConfirm}>
						ลบ {items.length} รายการ
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
