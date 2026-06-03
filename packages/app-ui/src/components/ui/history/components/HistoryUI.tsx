import { Separator } from "@workspace/ui/components/separator";

import type { HistoryProps } from "@workspace/app-ui/types/history";

import { useHistoryTransfers } from "../hooks/useHistoryTransfers";
import { HistoryRemoveDialog } from "./HistoryRemoveDialog";
import { HistoryToolbar } from "./HistoryToolbar";
import { HistoryTransferList } from "./HistoryTransferList";

export function HistoryUI(props: HistoryProps) {
	const controller = useHistoryTransfers({
		data: props.data,
		loading: props.loading,
		onBulkDelete: props.onBulkDelete,
		onItemRemove: props.onItemRemove,
		onItemReveal: props.onItemReveal,
		onRefresh: props.onRefresh,
		onTransferDetails: props.onTransferDetails,
	});

	return (
		<div
			className="flex h-full flex-col focus:outline-none focus:ring-0"
			onClick={controller.handleSurfaceClick}
			onKeyDown={controller.handleKeyDown}
			tabIndex={0}
		>
			<div className="flex min-h-0 flex-1 flex-col">
				<header className="space-y-4 pb-4">
					<div className="space-y-1">
						<h1 className="text-2xl font-semibold tracking-tight">ประวัติการแชร์</h1>
						<p className="text-sm text-muted-foreground">ไฟล์ที่กำลังรับส่งและประวัติการแชร์จะแสดงที่นี่</p>
					</div>

					<HistoryToolbar
						controller={controller}
						linkComponent={props.linkComponent}
						loading={props.loading}
					/>

					<Separator className="my-1" />
				</header>

				<HistoryTransferList
					controller={controller}
					linkComponent={props.linkComponent}
					onTransferDetails={props.onTransferDetails}
				/>
			</div>

			<HistoryRemoveDialog controller={controller} />
		</div>
	);
}
