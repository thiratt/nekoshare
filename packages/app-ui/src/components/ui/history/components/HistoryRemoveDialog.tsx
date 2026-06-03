import { LuTrash2 } from "react-icons/lu";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";

import type { HistoryTransfersController } from "../hooks/useHistoryTransfers";

type HistoryRemoveDialogProps = {
	controller: HistoryTransfersController;
};

export function HistoryRemoveDialog({ controller }: HistoryRemoveDialogProps) {
	return (
		<AlertDialog open={Boolean(controller.pendingRemove)} onOpenChange={controller.handleRemoveDialogOpenChange}>
			<AlertDialogContent
				className="max-w-sm"
				onClick={controller.stopSurfaceEvent}
				onPointerDown={controller.stopSurfaceEvent}
			>
				<AlertDialogHeader>
					<AlertDialogMedia className="text-destructive">
						<LuTrash2 />
					</AlertDialogMedia>
					<AlertDialogTitle>{controller.pendingRemoveTitle}</AlertDialogTitle>
					<AlertDialogDescription>
						การลบรายการนี้จะลบเฉพาะประวัติการโอนใน Neko Share ไม่ได้ลบไฟล์จริงในเครื่อง
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={controller.clearPendingRemove}>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={controller.handleConfirmRemoveHistory}>
						ลบออกจากประวัติ
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
