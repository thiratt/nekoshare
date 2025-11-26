import { useState, useEffect } from "react";

type SidebarState = "on" | "off";
const LS_KEY = "nekoshare";

export function useSidebar() {
	const [sidebar, setSidebarState] = useState<SidebarState>(() => {
		const saved = localStorage.getItem(`${LS_KEY}-sidebar`);
		return saved === "on" || saved === "off" ? saved : "on"; // เปลี่ยน default เป็น "on"
	});

	const setSidebar = (state: SidebarState) => {
		localStorage.setItem(`${LS_KEY}-sidebar`, state);
		setSidebarState(state);
	};

	useEffect(() => {
		const handleStorage = (e: StorageEvent) => {
			if (e.key === `${LS_KEY}-sidebar` && (e.newValue === "on" || e.newValue === "off")) {
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
