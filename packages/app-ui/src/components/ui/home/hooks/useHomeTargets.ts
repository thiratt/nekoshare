import { useState } from "react";

import type { HomeTarget } from "../types";

type UseHomeTargetsOptions = {
	selectedFileCount?: number;
};

export function useHomeTargets({ selectedFileCount = 0 }: UseHomeTargetsOptions = {}) {
	const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
	const [encrypted, setEncrypted] = useState(true);
	const [publicShare, setPublicShare] = useState(false);

	function setPublicShareMode(nextPublicShare: boolean) {
		setPublicShare(nextPublicShare);
		if (nextPublicShare) {
			setSelectedTargetIds([]);
		}
	}

	function toggleTarget(targetId: string) {
		if (publicShare) return;

		setSelectedTargetIds((current) =>
			current.includes(targetId) ? current.filter((id) => id !== targetId) : [...current, targetId],
		);
	}

	function selectDroppedTarget(targetId: string) {
		if (publicShare) return;
		setSelectedTargetIds((current) => (current.includes(targetId) ? current : [...current, targetId]));
	}

	function getSelectedTargets(targets: HomeTarget[]) {
		const selectedIdSet = new Set(selectedTargetIds);
		return targets.filter((target) => selectedIdSet.has(target.id));
	}

	return {
		encrypted,
		publicShare,
		selectedTargetIds,
		sendReady: selectedFileCount > 0 && (selectedTargetIds.length > 0 || publicShare),
		getSelectedTargets,
		selectDroppedTarget,
		setEncrypted,
		setPublicShareMode,
		toggleTarget,
	};
}
