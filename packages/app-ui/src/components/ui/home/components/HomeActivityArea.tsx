import { AnimatePresence, motion } from "motion/react";

import { homeRecentItems, homeTransfers } from "../constants";
import { HomeRecentItems, HomeTransfers } from "./HomeActivityList";
import { HomeTargetTray } from "./HomeTargetTray";
import type { HomeUIProps } from "../types";

type HomeActivityAreaProps = {
	devices: NonNullable<HomeUIProps["devices"]>;
	friends: NonNullable<HomeUIProps["friends"]>;
	hasSelectedFiles: boolean;
	publicShare: boolean;
	selectedTargetIds: string[];
	onToggleTarget: (targetId: string) => void;
};

export function HomeActivityArea({
	devices,
	friends,
	hasSelectedFiles,
	onToggleTarget,
	publicShare,
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
						<HomeTransfers transfers={homeTransfers} />
						<HomeRecentItems items={homeRecentItems} />
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
