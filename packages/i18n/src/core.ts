export const SUPPORTED_LANGUAGES = ["th", "en"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const FALLBACK_LANGUAGE: AppLanguage = "th";
export const DEFAULT_NAMESPACE = "translation";
export const LANGUAGE_STORAGE_KEY = "nekoshare.language";
export const LANGUAGE_SYNC_STORAGE_KEY = "nekoshare.language.syncAccount";

export function isSupportedLanguage(value: unknown): value is AppLanguage {
  return typeof value === "string" && SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

function getSupportedLanguageCandidate(value: string): AppLanguage | null {
  const normalized = value.trim().toLowerCase();
  if (isSupportedLanguage(normalized)) {
    return normalized;
  }

  const base = normalized.split(/[-_]/)[0];
  return isSupportedLanguage(base) ? base : null;
}

export function normalizeLanguage(value?: string | null): AppLanguage {
  if (!value) {
    return FALLBACK_LANGUAGE;
  }

  return getSupportedLanguageCandidate(value) ?? FALLBACK_LANGUAGE;
}

export function parseAcceptLanguage(header?: string | null): AppLanguage {
  if (!header) {
    return FALLBACK_LANGUAGE;
  }

  const candidates = header
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim())
    .filter((entry): entry is string => Boolean(entry));

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const language = getSupportedLanguageCandidate(candidate);
    if (language) {
      return language;
    }
  }

  return FALLBACK_LANGUAGE;
}

export function detectNavigatorLanguage(
  languages?: readonly string[] | null,
  fallbackLanguage: string = FALLBACK_LANGUAGE,
): AppLanguage {
  const candidates = languages?.length ? languages : [fallbackLanguage];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const language = getSupportedLanguageCandidate(candidate);
    if (language) {
      return language;
    }
  }

  return FALLBACK_LANGUAGE;
}
