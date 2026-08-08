import React from "react";

import { LuSend } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { SearchInput } from "@workspace/ui/components/search-input";
import { cn } from "@workspace/ui/lib/utils";

import { AnimatePresence, motion } from "@workspace/app-ui/components/provide-animate";

import { isActiveTransfer, matchesTransferFilter } from "../utils/transfer-utils";
import { HomeTransferDetailsPane } from "./HomeTransferDetailsPane";
import { HomeTransferEmptyState } from "./HomeTransferEmptyState";
import { HomeTransferList } from "./HomeTransferList";
import type { HomeUIProps, TransferFilter } from "../types";

const filters: Array<{
	value: TransferFilter;
	label: string;
}> = [
	{ value: "all", label: "All" },
	{ value: "sending", label: "Sending" },
	{ value: "receiving", label: "Receiving" },
	{ value: "completed", label: "Completed" },
	{ value: "failed", label: "Failed" },
];

export function HomeUI({ transfers, loading = false, onPause, onQuickSend, onRetry }: HomeUIProps) {
	const [filter, setFilter] = React.useState<TransferFilter>("all");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [selectedId, setSelectedId] = React.useState<string | null>(null);

	const visibleTransfers = React.useMemo(() => {
		const normalizedQuery = searchQuery.trim().toLowerCase();

		return transfers.filter((transfer) => {
			const matches = matchesTransferFilter(transfer, filter);

			const matchesSearch =
				normalizedQuery.length === 0 ||
				transfer.name.toLowerCase().includes(normalizedQuery) ||
				transfer.peerName.toLowerCase().includes(normalizedQuery);

			return matches && matchesSearch;
		});
	}, [filter, searchQuery, transfers]);

	const selectedTransfer = transfers.find((transfer) => transfer.id === selectedId) ?? null;

	const activeCount = transfers.filter((transfer) => isActiveTransfer(transfer)).length;

	React.useEffect(() => {
		if (selectedId && !visibleTransfers.some((transfer) => transfer.id === selectedId)) {
			setSelectedId(null);
		}
	}, [selectedId, visibleTransfers]);

	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background">
			<div className="shrink-0 border-b">
				<div className="flex flex-wrap items-center gap-2 p-2">
					<ButtonGroup>
						{filters.map((item) => (
							<Button
								key={item.value}
								type="button"
								variant={filter === item.value ? "secondary" : "outline"}
								size="sm"
								className={cn("h-8", filter === item.value && "border")}
								aria-pressed={filter === item.value}
								onClick={() => setFilter(item.value)}
								disabled={visibleTransfers.length === 0 && item.value !== "all"}
							>
								{item.label}
							</Button>
						))}
					</ButtonGroup>

					<div className="flex-1" />

					<SearchInput
						searchQuery={searchQuery}
						onSearchQuery={setSearchQuery}
						onClearSearch={() => setSearchQuery("")}
						placeholder="Search transfers..."
						className="w-full shadow-none sm:w-72"
						disabled={visibleTransfers.length === 0}
					/>

					<Button type="button" size="sm" className="h-8 gap-2" disabled={!onQuickSend} onClick={onQuickSend}>
						<LuSend />
						Send files
					</Button>
				</div>
			</div>

			<div className="flex min-h-0 flex-1">
				<div className="min-w-0 flex-1 overflow-auto">
					{visibleTransfers.length > 0 ? (
						<HomeTransferList
							transfers={visibleTransfers}
							selectedId={selectedId}
							onSelect={setSelectedId}
						/>
					) : (
						<HomeTransferEmptyState
							searchQuery={searchQuery}
							filter={filter}
							loading={loading}
							onReset={() => {
								setSearchQuery("");
								setFilter("all");
							}}
						/>
					)}
				</div>

				<AnimatePresence initial={false}>
					{selectedTransfer && (
						<motion.aside
							key="transfer-details"
							initial={{ width: 0, opacity: 0 }}
							animate={{ width: 320, opacity: 1 }}
							exit={{ width: 0, opacity: 0 }}
							transition={{
								width: {
									duration: 0.22,
									ease: [0.22, 1, 0.36, 1],
								},
								opacity: {
									duration: 0.14,
								},
							}}
							className="shrink-0 overflow-hidden border-l"
						>
							<div className="h-full w-80">
								<HomeTransferDetailsPane
									transfer={selectedTransfer}
									onClose={() => setSelectedId(null)}
									onPause={onPause ? () => onPause(selectedTransfer.id) : undefined}
									onRetry={onRetry ? () => onRetry(selectedTransfer.id) : undefined}
								/>
							</div>
						</motion.aside>
					)}
				</AnimatePresence>
			</div>

			<div className="flex h-8 shrink-0 items-center border-t bg-muted/15 px-3 text-xs text-muted-foreground">
				{visibleTransfers.length} transfers | {activeCount} active
			</div>
		</div>
	);
}
