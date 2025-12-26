import { useEffect, useRef } from "react";

import { useNekoSocket } from "./useNekoSocket";

export function useSocketInterval(callback: () => void, delay: number | null) {
	const { status } = useNekoSocket();
	const savedCallback = useRef(callback);

	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	useEffect(() => {
		if (delay === null || status !== "connected") {
			return;
		}

		const tick = () => {
			savedCallback.current();
		};

		tick();

		const id = setInterval(tick, delay);
		return () => clearInterval(id);
	}, [delay, status]);
}
