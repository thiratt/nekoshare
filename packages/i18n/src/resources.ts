import { type AppLanguage, DEFAULT_NAMESPACE } from "./core";
import accountEn from "./locales/en/account.json";
import authEn from "./locales/en/auth.json";
import commonEn from "./locales/en/common.json";
import errorsEn from "./locales/en/errors.json";
import serverAuthEn from "./locales/en/serverAuth.json";
import settingsEn from "./locales/en/settings.json";
import accountTh from "./locales/th/account.json";
import authTh from "./locales/th/auth.json";
import commonTh from "./locales/th/common.json";
import errorsTh from "./locales/th/errors.json";
import serverAuthTh from "./locales/th/serverAuth.json";
import settingsTh from "./locales/th/settings.json";

type TranslationResource = Record<string, unknown>;
type DotNestedStringKeys<T> = {
  [Key in keyof T & string]: T[Key] extends string
    ? Key
    : T[Key] extends Record<string, unknown>
      ? `${Key}.${DotNestedStringKeys<T[Key]>}`
      : never;
}[keyof T & string];

function isPlainObject(value: unknown): value is TranslationResource {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectShapeMismatches(
  reference: TranslationResource,
  target: TranslationResource,
  prefix = "",
): string[] {
  const mismatches: string[] = [];
  const keys = new Set([...Object.keys(reference), ...Object.keys(target)]);

  for (const key of keys) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    const left = reference[key];
    const right = target[key];

    if (left === undefined || right === undefined) {
      mismatches.push(nextPrefix);
      continue;
    }

    const leftIsObject = isPlainObject(left);
    const rightIsObject = isPlainObject(right);

    if (leftIsObject !== rightIsObject) {
      mismatches.push(nextPrefix);
      continue;
    }

    if (leftIsObject && rightIsObject) {
      mismatches.push(...collectShapeMismatches(left, right, nextPrefix));
    }
  }

  return mismatches;
}

function assertLocaleParity(reference: TranslationResource, target: TranslationResource, label: AppLanguage): void {
  const mismatches = collectShapeMismatches(reference, target);
  if (mismatches.length > 0) {
    throw new Error(`Locale parity check failed for "${label}": ${mismatches.join(", ")}`);
  }
}

const enTranslation = {
  account: accountEn,
  auth: authEn,
  common: commonEn,
  errors: errorsEn,
  serverAuth: serverAuthEn,
  settings: settingsEn,
} as const;

const thTranslation = {
  account: accountTh,
  auth: authTh,
  common: commonTh,
  errors: errorsTh,
  serverAuth: serverAuthTh,
  settings: settingsTh,
} as const;

assertLocaleParity(enTranslation, thTranslation, "th");
assertLocaleParity(thTranslation, enTranslation, "en");

export const resources = {
  en: { [DEFAULT_NAMESPACE]: enTranslation },
  th: { [DEFAULT_NAMESPACE]: thTranslation },
} as const;

export const defaultNS = DEFAULT_NAMESPACE;

export type TranslationTree = (typeof resources)["en"][typeof DEFAULT_NAMESPACE];
export type AppTranslationKey = DotNestedStringKeys<TranslationTree>;
export type AppTOptions = Record<string, unknown>;
export type AppTFunction = (key: AppTranslationKey, options?: AppTOptions) => string;
