import { useState, useEffect } from "react";

type SidebarState = "on" | "off";
const LS_KEY = "nekoshare-notification";

export function useNotification() {
	const [sidebar, setSidebarState] = useState<SidebarState>(() => {
		const saved = localStorage.getItem(`${LS_KEY}`);
		return saved === "on" || saved === "on" ? saved : "off";
	});

	const setSidebar = (state: SidebarState) => {
		localStorage.setItem(`${LS_KEY}`, state);
		setSidebarState(state);
	};

	useEffect(() => {
		const handleStorage = (e: StorageEvent) => {
			if (e.key === `${LS_KEY}` && (e.newValue === "on" || e.newValue === "off")) {
				setSidebarState(e.newValue);
			}
		};

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);

	return {
		sidebar,
		setSidebar,
		isOpen: sidebar === "on",
		toggleSidebar: () => setSidebar(sidebar === "on" ? "off" : "on"),
	};
}
