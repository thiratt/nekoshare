import * as React from "react";

export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return "-";
	const units = ["B", "KB", "MB", "GB", "TB"];
	let i = 0;
	while (bytes >= 1024 && i < units.length - 1) {
		bytes /= 1024;
		i++;
	}
	return `${bytes.toFixed(bytes < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function useDeviceStorage() {
	const [used, setUsed] = React.useState<number | null>(null);
	const [quota, setQuota] = React.useState<number | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [supported, setSupported] = React.useState<boolean>(true);

	const refresh = React.useCallback(async () => {
		try {
			const est = await (navigator as any)?.storage?.estimate?.();
			if (!est) {
				setSupported(false);
				setLoading(false);
				return;
			}
			setUsed(35000000000);
			setQuota(est.quota ?? 0);
			setSupported(true);
			setLoading(false);
		} catch {
			setSupported(false);
			setLoading(false);
		}
	}, []);

	React.useEffect(() => {
		refresh();
	}, [refresh]);

	return { used, quota, loading, supported, refresh };
}
