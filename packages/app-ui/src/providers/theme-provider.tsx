import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

import type { Theme, ThemeProviderProps, ThemeProviderState } from "@workspace/app-ui/types/theme";

const STORAGE_KEY = "nekoshare-ui-theme";
const SYNC_STORAGE_KEY = "nekoshare-ui-theme-sync-account";
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const initialState: ThemeProviderState = {
	theme: "system",
	setTheme: () => null,
	setSyncThemeFromAccount: () => null,
	setAccountThemeSyncPaused: () => null,
	accountThemeSyncPaused: false,
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
	const [theme, setThemeState] = useState<Theme>(defaultTheme);
	const [themeHydrated, setThemeHydrated] = useState(false);
	const [syncThemeFromAccount, setSyncThemeFromAccountState] = useState(true);
	const [accountThemeSyncPaused, setAccountThemeSyncPausedState] = useState(false);

	useIsomorphicLayoutEffect(() => {
		let storedTheme = defaultTheme;
		let storedSyncThemeFromAccount = true;

		try {
			storedTheme = normalizeTheme(localStorage.getItem(storageKey)) ?? defaultTheme;

			const storedSyncPreference = localStorage.getItem(SYNC_STORAGE_KEY);
			storedSyncThemeFromAccount = storedSyncPreference === null ? true : storedSyncPreference !== "false";
		} catch {
			// Storage may be unavailable in restricted browser contexts.
		}

		setThemeState(storedTheme);
		setSyncThemeFromAccountState(storedSyncThemeFromAccount);
		setThemeHydrated(true);
	}, [defaultTheme, storageKey]);

	useIsomorphicLayoutEffect(() => {
		if (!themeHydrated) {
			return;
		}

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
            }`,
					),
				);
				document.head.appendChild(css);

				(() => window.getComputedStyle(document.body))();
			}

			root.classList.remove("light", "dark");
			root.classList.add(targetTheme);
			root.style.colorScheme = targetTheme;

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
	}, [theme, disableTransitionOnChange, themeHydrated]);

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

	const setAccountThemeSyncPaused = useCallback((paused: boolean) => {
		setAccountThemeSyncPausedState(paused);
	}, []);

	const value = useMemo<ThemeProviderState>(
		() => ({
			theme,
			setTheme,
			setSyncThemeFromAccount,
			setAccountThemeSyncPaused,
			accountThemeSyncPaused,
			syncThemeFromAccount,
		}),
		[
			accountThemeSyncPaused,
			setAccountThemeSyncPaused,
			setSyncThemeFromAccount,
			setTheme,
			syncThemeFromAccount,
			theme,
		],
	);

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
	const { accountThemeSyncPaused, setTheme, syncThemeFromAccount, theme } = useTheme();
	const normalizedAccountTheme = normalizeTheme(accountTheme);

	useEffect(() => {
		if (
			accountThemeSyncPaused ||
			!syncThemeFromAccount ||
			!normalizedAccountTheme ||
			normalizedAccountTheme === theme
		) {
			return;
		}

		setTheme(normalizedAccountTheme);
	}, [accountThemeSyncPaused, normalizedAccountTheme, setTheme, syncThemeFromAccount, theme]);
}
