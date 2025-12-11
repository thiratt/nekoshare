/*
    TODO: implement real data fetching logic
    and move this hook to appropriate location
*/

import { useState, useEffect, useCallback } from "react";

import type { FileData, ShareItem, Status } from "@workspace/app-ui/types/home";
import { MOCK_DEVICES, formatFileSize, getFileType } from "./constants";

interface UseShareDataProps {
	data: FileData[];
	externalLoading?: boolean;
}

interface UseShareDataReturn {
	items: ShareItem[];
	loading: boolean;
	refreshData: () => void;
	setItems: React.Dispatch<React.SetStateAction<ShareItem[]>>;
}

export function useShareData({ data, externalLoading }: UseShareDataProps): UseShareDataReturn {
	const [items, setItems] = useState<ShareItem[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (externalLoading) {
			setLoading(true);
			return;
		}

		const transformedItems: ShareItem[] = data.map((file, index) => {
			const isFromMe = Math.random() > 0.5;
			const mockDevice = isFromMe ? MOCK_DEVICES[index % MOCK_DEVICES.length] : null;

			return {
				id: index + 1,
				name: file.name,
				from: isFromMe ? "me" : "buddy",
				device: mockDevice ?? null,
				friendName: !isFromMe ? "Friend" : undefined,
				status: "success" as Status,
				uploadedAt: (file.modifiedAt || file.createdAt || new Date()).toISOString(),
				isReaded: true,
				canDownload: file.isFile,
				size: formatFileSize(file.size),
				type: file.isDirectory ? "folder" : getFileType(file.name),
				sharedWith: Math.floor(Math.random() * 5),
			};
		});

		setItems(transformedItems);
		setLoading(false);
	}, [data, externalLoading]);

	const refreshData = useCallback(() => {
		setLoading(true);
		const timer = setTimeout(() => setLoading(false), 500);
		return () => clearTimeout(timer);
	}, []);

	return { items, loading, refreshData, setItems };
}
