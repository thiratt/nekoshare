import { BaseDirectory } from "@tauri-apps/api/path";
import { exists, mkdir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";

const MASTER_KEY_DIR_PATH = "Nekoshare/msk";
const MASTER_KEY_FILE_PATH = `${MASTER_KEY_DIR_PATH}/msk`;
const MASTER_KEY_BYTES = 32;
const MASTER_KEY_HEX_REGEX = /^[a-fA-F0-9]{64}$/;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function generateMasterKeyHex(): string {
  const bytes = new Uint8Array(MASTER_KEY_BYTES);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

function normalizeMasterKey(value: string): string | null {
  const normalized = value.trim();
  if (!MASTER_KEY_HEX_REGEX.test(normalized)) {
    return null;
  }
  return normalized.toLowerCase();
}

async function writeMasterKey(masterKey: string): Promise<void> {
  await mkdir(MASTER_KEY_DIR_PATH, {
    baseDir: BaseDirectory.LocalData,
    recursive: true,
  });

  await writeTextFile(MASTER_KEY_FILE_PATH, masterKey, {
    baseDir: BaseDirectory.LocalData,
  });
}

export async function readMasterKeyFile(): Promise<string | null> {
  const hasMasterKey = await exists(MASTER_KEY_FILE_PATH, {
    baseDir: BaseDirectory.LocalData,
  });

  if (!hasMasterKey) {
    return null;
  }

  const content = await readTextFile(MASTER_KEY_FILE_PATH, {
    baseDir: BaseDirectory.LocalData,
  });

  return normalizeMasterKey(content);
}

export async function writeMasterKeyFile(masterKey: string): Promise<void> {
  const normalized = normalizeMasterKey(masterKey);
  if (!normalized) {
    throw new Error("Invalid master key format");
  }

  await writeMasterKey(normalized);
}

export async function ensureMasterKeyFile(): Promise<string> {
  const existingKey = await readMasterKeyFile();
  if (existingKey) {
    return existingKey;
  }

  const generated = generateMasterKeyHex();
  await writeMasterKey(generated);

  return generated;
}

export async function removeMasterKeyFile(): Promise<void> {
  const hasMasterKey = await exists(MASTER_KEY_FILE_PATH, {
    baseDir: BaseDirectory.LocalData,
  });

  if (!hasMasterKey) {
    return;
  }

  await remove(MASTER_KEY_FILE_PATH, {
    baseDir: BaseDirectory.LocalData,
  });
}
