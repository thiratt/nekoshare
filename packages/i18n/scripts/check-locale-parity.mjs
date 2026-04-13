import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const localeRoot = join(packageRoot, "src", "locales");
const languages = ["en", "th"];

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNamespaces(language) {
  const languageRoot = join(localeRoot, language);
  return readdirSync(languageRoot)
    .filter((file) => extname(file) === ".json")
    .map((file) => basename(file, ".json"))
    .sort();
}

function readNamespace(language, namespace) {
  const filePath = join(localeRoot, language, `${namespace}.json`);
  if (!existsSync(filePath)) {
    return null;
  }

  return JSON.parse(readFileSync(filePath, "utf8"));
}

function collectShapeMismatches(reference, target, prefix = "") {
  const mismatches = [];
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

const errors = [];
const namespaceByLanguage = new Map(languages.map((language) => [language, readNamespaces(language)]));

for (const language of languages) {
  for (const targetLanguage of languages) {
    if (language === targetLanguage) {
      continue;
    }

    const namespaces = namespaceByLanguage.get(language);
    const targetNamespaces = new Set(namespaceByLanguage.get(targetLanguage));

    for (const namespace of namespaces) {
      if (!targetNamespaces.has(namespace)) {
        errors.push(`${targetLanguage} is missing namespace ${namespace}.json`);
        continue;
      }

      const mismatches = collectShapeMismatches(
        readNamespace(language, namespace),
        readNamespace(targetLanguage, namespace),
      );

      for (const mismatch of mismatches) {
        errors.push(`${targetLanguage}.${namespace}.${mismatch} does not match ${language}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`Locale parity failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exit(1);
}

console.log("Locale parity OK");
