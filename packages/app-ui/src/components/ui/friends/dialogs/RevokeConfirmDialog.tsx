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

type RevokeConfirmDialogProps = {
	open: boolean;
	count: number;
	onConfirm: () => void;
	onCancel: () => void;
};

export function RevokeConfirmDialog({ count, onCancel, onConfirm, open }: RevokeConfirmDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
			<AlertDialogContent className="max-w-sm">
				<AlertDialogHeader className="text-left">
					<AlertDialogTitle className="text-base font-semibold">ลบเพื่อน {count} คน?</AlertDialogTitle>
					<AlertDialogDescription className="text-sm text-neutral-500">
						การดำเนินการนี้จะลบเพื่อนออกจากรายการของคุณ คุณสามารถเพิ่มใหม่ได้ในภายหลัง
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="gap-2 sm:gap-2">
					<AlertDialogCancel onClick={onCancel} className="h-9 px-4 text-sm font-medium">
						ยกเลิก
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className="h-9 bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
					>
						ลบเพื่อน
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
