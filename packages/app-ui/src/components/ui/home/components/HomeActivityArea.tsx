import { AnimatePresence, motion } from "motion/react";

import { HomeRecentItems, HomeTransfers } from "./HomeActivityList";
import { HomeTargetTray } from "./HomeTargetTray";
import type { HomeActiveTransferItem, HomeRecentTransferItem, LegacyHomeUIProps } from "../types";

type HomeActivityAreaProps = {
	activeTransfers: HomeActiveTransferItem[];
	devices: NonNullable<LegacyHomeUIProps["devices"]>;
	friends: NonNullable<LegacyHomeUIProps["friends"]>;
	hasSelectedFiles: boolean;
	isLoadingRecentTransfers: boolean;
	publicShare: boolean;
	recentTransfers: HomeRecentTransferItem[];
	selectedTargetIds: string[];
	onToggleTarget: (targetId: string) => void;
	onViewAllRecentTransfers?: () => void;
};

export function HomeActivityArea({
	activeTransfers,
	devices,
	friends,
	hasSelectedFiles,
	isLoadingRecentTransfers,
	onToggleTarget,
	onViewAllRecentTransfers,
	publicShare,
	recentTransfers,
	selectedTargetIds,
}: HomeActivityAreaProps) {
	return (
		<AnimatePresence initial={false}>
			{hasSelectedFiles ? (
				<motion.div
					key="targets"
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: "auto", opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					className="w-full"
				>
					<div className="pt-4">
						<HomeTargetTray
							devices={devices}
							friends={friends}
							selectedTargetIds={selectedTargetIds}
							publicShare={publicShare}
							onToggleTarget={onToggleTarget}
						/>
					</div>
				</motion.div>
			) : (
				<motion.div
					key="activity"
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: "auto", opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					className="w-full overflow-hidden"
				>
					<div className="space-y-2 pt-4">
						{activeTransfers.length > 0 && <HomeTransfers transfers={activeTransfers} />}
						{recentTransfers.length > 0 && (
							<HomeRecentItems
								items={recentTransfers}
								isLoading={isLoadingRecentTransfers}
								onViewAll={onViewAllRecentTransfers}
							/>
						)}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
