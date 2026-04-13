export type Theme = "dark" | "light" | "system";

export type ThemeProviderProps = {
	children: React.ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
};

export type ThemeProviderState = {
	theme: Theme;
	setTheme: (theme: Theme, options?: { persist?: boolean }) => void;
	setSyncThemeFromAccount: (enabled: boolean) => void;
	setAccountThemeSyncPaused: (paused: boolean) => void;
	accountThemeSyncPaused: boolean;
	syncThemeFromAccount: boolean;
};
