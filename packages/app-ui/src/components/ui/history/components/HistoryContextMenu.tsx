import {
	LuCopy,
	LuFileText,
	LuFolderOpen,
	LuInfo,
	LuPause,
	LuPlay,
	LuRefreshCcw,
	LuRotateCcw,
	LuTrash2,
	LuX,
} from "react-icons/lu";
import { TbSelectAll } from "react-icons/tb";

import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@workspace/ui/components/context-menu";

import type { HistoryTransfersController } from "../hooks/useHistoryTransfers";

type HistoryContextMenuProps = {
	controller: HistoryTransfersController;
};

export function HistoryContextMenu({ controller }: HistoryContextMenuProps) {
	return (
		<ContextMenuContent
			className="w-64"
			onClick={controller.stopSurfaceEvent}
			onPointerDown={controller.stopSurfaceEvent}
		>
			{controller.contextTransfers.length === 0 ? (
				<>
					<ContextMenuItem onSelect={controller.refreshData}>
						<LuRefreshCcw />
						รีเฟรช
					</ContextMenuItem>
					<ContextMenuItem
						disabled={controller.visibleTransfers.length === 0}
						onSelect={controller.selectAll}
					>
						<TbSelectAll />
						เลือกทั้งหมด
					</ContextMenuItem>
				</>
			) : (
				<>
					{controller.contextActionState.canPause ? (
						<ContextMenuItem onSelect={controller.handleContextPause}>
							<LuPause />
							หยุดรายการที่เลือกชั่วคราว
						</ContextMenuItem>
					) : null}
					{controller.contextActionState.canResume ? (
						<ContextMenuItem onSelect={controller.handleContextResume}>
							<LuPlay />
							ดำเนินการรายการที่เลือกต่อ
						</ContextMenuItem>
					) : null}
					{controller.contextActionState.canRetry ? (
						<ContextMenuItem onSelect={controller.handleContextRetry}>
							<LuRotateCcw />
							ลองรายการที่ล้มเหลวใหม่
						</ContextMenuItem>
					) : null}

					{controller.contextActionState.canPause ||
					controller.contextActionState.canResume ||
					controller.contextActionState.canRetry ? (
						<ContextMenuSeparator />
					) : null}

					<ContextMenuItem
						disabled={!controller.contextActionState.isSingle}
						onSelect={controller.handleContextDetails}
					>
						<LuInfo />
						ดูรายละเอียด
					</ContextMenuItem>
					<ContextMenuItem onSelect={controller.handleContextCopyInfo}>
						<LuCopy />
						คัดลอกข้อมูลการโอน
					</ContextMenuItem>
					<ContextMenuItem onSelect={controller.handleContextCopyTransferIds}>
						<LuFileText />
						คัดลอก Transfer ID
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!controller.contextActionState.isSingle}
						onSelect={controller.handleContextReveal}
					>
						<LuFolderOpen />
						เปิดตำแหน่งไฟล์
					</ContextMenuItem>

					<ContextMenuSeparator />

					{controller.contextActionState.canCancel ? (
						<ContextMenuItem variant="destructive" onSelect={controller.handleContextCancel}>
							<LuX />
							ยกเลิกรายการที่เลือก
						</ContextMenuItem>
					) : null}
					{controller.contextActionState.canRemove ? (
						<ContextMenuItem variant="destructive" onSelect={controller.handleContextRemove}>
							<LuTrash2 />
							ลบออกจากประวัติ
						</ContextMenuItem>
					) : null}
				</>
			)}
		</ContextMenuContent>
	);
}
