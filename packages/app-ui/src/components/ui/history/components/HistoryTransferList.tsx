import { AnimatePresence, motion } from "motion/react";

import { CardContent } from "@workspace/ui/components/card";
import { ContextMenu, ContextMenuTrigger } from "@workspace/ui/components/context-menu";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

import type { LinkComponent } from "@workspace/app-ui/types/link";

import { TRANSFER_ITEM_TRANSITION, TRANSFER_LIST_TRANSITION } from "../constants";
import { ActiveTransferCard } from "./ActiveTransferCard";
import { HistoryContextMenu } from "./HistoryContextMenu";
import type { HistoryTransfersController } from "../hooks/useHistoryTransfers";

type HistoryTransferListProps = {
	controller: HistoryTransfersController;
	linkComponent: LinkComponent;
	onTransferDetails?: (id: string) => void;
};

export function HistoryTransferList({ controller, linkComponent, onTransferDetails }: HistoryTransferListProps) {
	return (
		<CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div ref={controller.scrollAreaRootRef} className="min-h-0 flex-1">
				<ScrollArea className="h-full">
					<ContextMenu>
						<ContextMenuTrigger asChild>
							<motion.div
								layout
								className="relative flex min-h-full flex-col gap-2 py-2 pr-2.5"
								onContextMenuCapture={(event) => {
									if (
										event.target instanceof HTMLElement &&
										event.target.closest("[data-selectable-id]")
									) {
										return;
									}

									controller.setContextTransferId(null);
									controller.setIsBackgroundContext(true);
								}}
								{...controller.dragSelection.containerProps}
							>
								{controller.dragSelection.selectionBox ? (
									<div
										className="pointer-events-none absolute z-50 border border-primary/70 bg-primary/15"
										style={{
											left: controller.dragSelection.selectionBox.left,
											top: controller.dragSelection.selectionBox.top,
											width: controller.dragSelection.selectionBox.width,
											height: controller.dragSelection.selectionBox.height,
										}}
									/>
								) : null}

								<AnimatePresence initial={false} mode="popLayout">
									{controller.visibleTransfers.length === 0 ? (
										<motion.div
											key="empty"
											layout
											initial={{ opacity: 0, scale: 0.96 }}
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0, scale: 0.96 }}
											transition={{
												duration: 0.18,
												ease: [0.16, 1, 0.3, 1],
											}}
											className="flex min-h-[calc(100vh-260px)] flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
										>
											{controller.emptyStateText}
										</motion.div>
									) : (
										controller.visibleTransfers.map((transfer) => (
											<motion.div
												key={transfer.id}
												layout="position"
												data-selectable-id={transfer.id}
												initial={{
													opacity: 0,
													scale: 0.985,
													y: 10,
												}}
												animate={{
													opacity: 1,
													scale: 1,
													y: 0,
												}}
												exit={{
													opacity: 0,
													scale: 0.985,
													y: -8,
													transition: {
														duration: 0.16,
														ease: [0.16, 1, 0.3, 1],
													},
												}}
												transition={{
													layout: TRANSFER_LIST_TRANSITION,
													default: TRANSFER_ITEM_TRANSITION,
												}}
												style={{
													originY: 0.5,
												}}
											>
												<ActiveTransferCard
													selected={controller.isSelected(transfer.id)}
													transfer={transfer}
													onShowDetails={onTransferDetails}
													linkComponent={linkComponent}
													detailsHref={`/share/${transfer.transferDetailsId ?? transfer.id}`}
													onSelected={(event) => controller.selectItem(transfer.id, event)}
													onContextSelected={() => {
														controller.setContextTransferId(transfer.id);
														controller.setIsBackgroundContext(false);
														controller.ensureSelectedForContextMenu(transfer.id);
													}}
												/>
											</motion.div>
										))
									)}
								</AnimatePresence>
							</motion.div>
						</ContextMenuTrigger>
						<HistoryContextMenu controller={controller} />
					</ContextMenu>
				</ScrollArea>
			</div>

			<div className="flex shrink-0 gap-2 border-t pt-4 text-sm text-muted-foreground">
				<p>{controller.visibleTransfers.length} รายการ</p>
				{controller.selectedCount > 0 && <p>({controller.selectedCount} รายการที่เลือก)</p>}
			</div>
		</CardContent>
	);
}
