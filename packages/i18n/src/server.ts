import { createInstance, type i18n as I18nInstance } from "i18next";

import { type AppLanguage, FALLBACK_LANGUAGE, normalizeLanguage, parseAcceptLanguage } from "./core";
import { type AppTFunction, defaultNS, resources } from "./resources";

import "./i18next";

export async function createServerI18n(language?: string | null): Promise<I18nInstance> {
  const instance = createInstance();
  await instance.init({
    defaultNS,
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
    lng: normalizeLanguage(language),
    ns: [defaultNS],
    resources,
  });

  return instance;
}

export function resolveRequestLanguage(params: {
  explicitLanguage?: string | null;
  headers?: Headers | Record<string, string | undefined> | null;
  sessionLanguage?: string | null;
}): AppLanguage {
  if (params.explicitLanguage) {
    return normalizeLanguage(params.explicitLanguage);
  }

  if (params.sessionLanguage) {
    return normalizeLanguage(params.sessionLanguage);
  }

  const acceptLanguage =
    params.headers instanceof Headers
      ? params.headers.get("accept-language")
      : params.headers?.["accept-language"] ?? params.headers?.["Accept-Language"];

  return acceptLanguage ? parseAcceptLanguage(acceptLanguage) : FALLBACK_LANGUAGE;
}

export async function getServerT(language?: string | null): Promise<AppTFunction> {
  const normalizedLanguage = normalizeLanguage(language);
  const instance = await createServerI18n(normalizedLanguage);
  return instance.getFixedT(normalizedLanguage, defaultNS) as AppTFunction;
}
