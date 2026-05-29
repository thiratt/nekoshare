import { CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";

import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";
import type { HistoryProps } from "@workspace/app-ui/types/history";

import { useHistoryTransfers } from "../hooks/useHistoryTransfers";
import { HistoryRemoveDialog } from "./HistoryRemoveDialog";
import { HistoryToolbar } from "./HistoryToolbar";
import { HistoryTransferList } from "./HistoryTransferList";

export function HistoryUI(props: HistoryProps) {
	const controller = useHistoryTransfers({
		onTransferDetails: props.onTransferDetails,
	});

	return (
		<div
			className="flex h-full flex-col focus:outline-none focus:ring-0"
			onClick={controller.handleSurfaceClick}
			onKeyDown={controller.handleKeyDown}
			tabIndex={0}
		>
			<CardTransition className="flex h-full flex-col gap-0" tag="history-card">
				<CardHeader>
					<div className="space-y-1">
						<CardTitle>ประวัติการแชร์</CardTitle>
						<CardDescription>ไฟล์ที่กำลังรับส่งและประวัติการแชร์จะแสดงที่นี่</CardDescription>
					</div>

					<HistoryToolbar
						controller={controller}
						linkComponent={props.linkComponent}
						loading={props.loading}
					/>

					<Separator className="my-1" />
				</CardHeader>

				<HistoryTransferList
					controller={controller}
					linkComponent={props.linkComponent}
					onTransferDetails={props.onTransferDetails}
				/>
			</CardTransition>

			<HistoryRemoveDialog controller={controller} />
		</div>
	);
}
