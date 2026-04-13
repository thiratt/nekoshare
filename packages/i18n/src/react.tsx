import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { createInstance, type i18n as I18nInstance } from "i18next";
import { I18nextProvider, initReactI18next, useTranslation } from "react-i18next";

import {
  type AppLanguage,
  detectNavigatorLanguage,
  FALLBACK_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_SYNC_STORAGE_KEY,
  normalizeLanguage,
} from "./core";
import { type AppTFunction, defaultNS, resources } from "./resources";

import "./i18next";

interface AppI18nContextValue {
  i18n: I18nInstance;
  language: AppLanguage;
  setLanguage: (language: AppLanguage, options?: { persist?: boolean }) => Promise<void>;
  setSyncLanguageFromAccount: (enabled: boolean) => void;
  syncLanguageFromAccount: boolean;
}

const AppI18nContext = createContext<AppI18nContextValue | null>(null);

let clientI18nPromise: Promise<I18nInstance> | null = null;

function getStoredLanguage(): AppLanguage | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored ? normalizeLanguage(stored) : null;
}

function setStoredLanguage(language: AppLanguage): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

function getStoredSyncPreference(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const stored = window.localStorage.getItem(LANGUAGE_SYNC_STORAGE_KEY);
  return stored === null ? true : stored !== "false";
}

function setStoredSyncPreference(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_SYNC_STORAGE_KEY, enabled ? "true" : "false");
}

export async function createClientI18n(language?: AppLanguage): Promise<I18nInstance> {
  const instance = createInstance();
  await instance.use(initReactI18next).init({
    defaultNS,
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
    lng: language ?? FALLBACK_LANGUAGE,
    ns: [defaultNS],
    resources,
  });

  return instance;
}

async function getClientI18n(initialLanguage: AppLanguage): Promise<I18nInstance> {
  if (!clientI18nPromise) {
    clientI18nPromise = createClientI18n(initialLanguage);
  }

  const instance = await clientI18nPromise;
  if (instance.language !== initialLanguage) {
    await instance.changeLanguage(initialLanguage);
  }

  return instance;
}

function resolveInitialLanguage(initialLanguage?: string): AppLanguage {
  const storedLanguage = getStoredLanguage();
  if (storedLanguage) {
    return storedLanguage;
  }

  if (initialLanguage) {
    return normalizeLanguage(initialLanguage);
  }

  if (typeof window !== "undefined") {
    return detectNavigatorLanguage(window.navigator.languages, window.navigator.language);
  }

  return FALLBACK_LANGUAGE;
}

export function AppI18nProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage?: string;
}) {
  const [language, setLanguageState] = useState<AppLanguage>(() => resolveInitialLanguage(initialLanguage));
  const [syncLanguageFromAccount, setSyncLanguageFromAccountState] = useState<boolean>(() => getStoredSyncPreference());
  const [instance, setInstance] = useState<I18nInstance | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getClientI18n(language).then((created) => {
      if (!cancelled) {
        setInstance(created);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [language]);

  const setLanguage = useCallback(
    async (nextLanguage: AppLanguage, options: { persist?: boolean } = {}) => {
      if (!instance) {
        return;
      }

      const normalized = normalizeLanguage(nextLanguage);
      await instance.changeLanguage(normalized);
      setLanguageState(normalized);

      if (options.persist !== false) {
        setStoredLanguage(normalized);
      }
    },
    [instance],
  );

  const setSyncLanguageFromAccount = useCallback((enabled: boolean) => {
    setSyncLanguageFromAccountState(enabled);
    setStoredSyncPreference(enabled);
  }, []);

  const contextValue = useMemo<AppI18nContextValue | null>(() => {
    if (!instance) {
      return null;
    }

    return {
      i18n: instance,
      language,
      setLanguage,
      setSyncLanguageFromAccount,
      syncLanguageFromAccount,
    };
  }, [instance, language, setLanguage, setSyncLanguageFromAccount, syncLanguageFromAccount]);

  if (!instance || !contextValue) {
    return null;
  }

  return (
    <I18nextProvider i18n={instance}>
      <AppI18nContext.Provider value={contextValue}>{children}</AppI18nContext.Provider>
    </I18nextProvider>
  );
}

export function useAppI18n() {
  const context = useContext(AppI18nContext);
  if (!context) {
    throw new Error("useAppI18n must be used within an AppI18nProvider");
  }

  const { t } = useTranslation();

  return {
    i18n: context.i18n,
    language: context.language,
    setLanguage: context.setLanguage,
    setSyncLanguageFromAccount: context.setSyncLanguageFromAccount,
    syncLanguageFromAccount: context.syncLanguageFromAccount,
    t: t as AppTFunction,
  };
}

export function useAccountLanguageSync(accountLanguage?: string | null): void {
  const { language, setLanguage, syncLanguageFromAccount } = useAppI18n();
  const normalizedAccountLanguage = accountLanguage ? normalizeLanguage(accountLanguage) : null;

  useEffect(() => {
    if (!syncLanguageFromAccount || !normalizedAccountLanguage || normalizedAccountLanguage === language) {
      return;
    }

    void setLanguage(normalizedAccountLanguage);
  }, [language, normalizedAccountLanguage, setLanguage, syncLanguageFromAccount]);
}
