import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { Theme, ThemeProviderProps, ThemeProviderState } from "@workspace/app-ui/types/theme";

const STORAGE_KEY = "nekoshare-ui-theme";
const SYNC_STORAGE_KEY = "nekoshare-ui-theme-sync-account";

const initialState: ThemeProviderState = {
	theme: "system",
	setTheme: () => null,
	setSyncThemeFromAccount: () => null,
	syncThemeFromAccount: true,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = STORAGE_KEY,
	disableTransitionOnChange = true,
	...props
}: ThemeProviderProps & { disableTransitionOnChange?: boolean }) {
	const [theme, setThemeState] = useState<Theme>(() => {
		if (typeof window !== "undefined") {
			return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
		}
		return defaultTheme;
	});
	const [syncThemeFromAccount, setSyncThemeFromAccountState] = useState<boolean>(() => {
		if (typeof window === "undefined") {
			return true;
		}

		const stored = localStorage.getItem(SYNC_STORAGE_KEY);
		return stored === null ? true : stored !== "false";
	});

	useEffect(() => {
		const root = window.document.documentElement;

		const updateDOM = (targetTheme: string) => {
			let css: HTMLStyleElement | null = null;

			if (disableTransitionOnChange) {
				css = document.createElement("style");
				css.appendChild(
					document.createTextNode(
						`* {
              -webkit-transition: none !important;
              -moz-transition: none !important;
              -o-transition: none !important;
              -ms-transition: none !important;
              transition: none !important;
            }`
					)
				);
				document.head.appendChild(css);

				(() => window.getComputedStyle(document.body))();
			}

			root.classList.remove("light", "dark");
			root.classList.add(targetTheme);

			if (disableTransitionOnChange && css) {
				setTimeout(() => {
					if (css) document.head.removeChild(css);
				}, 1);
			}
		};

		if (theme === "system") {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

			const handleSystemChange = () => {
				const systemTheme = mediaQuery.matches ? "dark" : "light";
				updateDOM(systemTheme);
			};

			handleSystemChange();

			mediaQuery.addEventListener("change", handleSystemChange);

			return () => mediaQuery.removeEventListener("change", handleSystemChange);
		} else {
			updateDOM(theme);
		}
	}, [theme, disableTransitionOnChange]);

	const setTheme = useCallback(
		(newTheme: Theme, options: { persist?: boolean } = {}) => {
			if (options.persist !== false) {
				localStorage.setItem(storageKey, newTheme);
			}

			setThemeState(newTheme);
		},
		[storageKey],
	);

	const setSyncThemeFromAccount = useCallback((enabled: boolean) => {
		localStorage.setItem(SYNC_STORAGE_KEY, enabled ? "true" : "false");
		setSyncThemeFromAccountState(enabled);
	}, []);

	const value = useMemo<ThemeProviderState>(() => ({
		theme,
		setTheme,
		setSyncThemeFromAccount,
		syncThemeFromAccount,
	}), [setSyncThemeFromAccount, setTheme, syncThemeFromAccount, theme]);

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);
	if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");
	return context;
};

function normalizeTheme(value?: string | null): Theme | null {
	return value === "dark" || value === "light" || value === "system" ? value : null;
}

export function useAccountThemeSync(accountTheme?: string | null): void {
	const { setTheme, syncThemeFromAccount, theme } = useTheme();
	const normalizedAccountTheme = normalizeTheme(accountTheme);

	useEffect(() => {
		if (!syncThemeFromAccount || !normalizedAccountTheme || normalizedAccountTheme === theme) {
			return;
		}

		setTheme(normalizedAccountTheme);
	}, [normalizedAccountTheme, setTheme, syncThemeFromAccount, theme]);
}
