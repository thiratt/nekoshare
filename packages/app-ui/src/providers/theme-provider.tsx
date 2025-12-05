import { createContext, useContext, useEffect, useState } from "react";
import type { Theme, ThemeProviderProps, ThemeProviderState } from "@workspace/app-ui/types/theme";

const STORAGE_KEY = "nekoshare-ui-theme";

const initialState: ThemeProviderState = {
	theme: "system",
	setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = STORAGE_KEY,
	disableTransitionOnChange = true,
	...props
}: ThemeProviderProps & { disableTransitionOnChange?: boolean }) {
	const [theme, setTheme] = useState<Theme>(() => {
		if (typeof window !== "undefined") {
			return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
		}
		return defaultTheme;
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

	const value = {
		theme,
		setTheme: (newTheme: Theme) => {
			localStorage.setItem(storageKey, newTheme);
			setTheme(newTheme);
		},
	};

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
