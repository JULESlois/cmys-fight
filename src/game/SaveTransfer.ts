import type { GameSave } from "./GameData";
import type { MetaProgress } from "./MetaProgress";
import type { GameSettings } from "./Settings";

export const SAVE_BUNDLE_FORMAT = "cmys-fight-save";
export const SAVE_BUNDLE_VERSION = 1;

export interface SaveBundlePayload {
  run: GameSave;
  meta: MetaProgress;
  settings: GameSettings;
}

export interface SaveBundle extends SaveBundlePayload {
  format: typeof SAVE_BUNDLE_FORMAT;
  version: number;
  exportedAt: string;
  checksum: string;
}

function checksumText(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function payloadChecksum(payload: SaveBundlePayload): string {
  return checksumText(JSON.stringify(payload));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function createSaveBundle(payload: SaveBundlePayload): SaveBundle {
  const normalizedPayload: SaveBundlePayload = JSON.parse(JSON.stringify(payload));
  return {
    format: SAVE_BUNDLE_FORMAT,
    version: SAVE_BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    ...normalizedPayload,
    checksum: payloadChecksum(normalizedPayload),
  };
}

export function parseSaveBundle(raw: string): SaveBundlePayload {
  const parsed: unknown = JSON.parse(raw);
  if (!isObject(parsed)) throw new Error("Save file is not an object.");
  if (parsed.format !== SAVE_BUNDLE_FORMAT) throw new Error("Unsupported save format.");
  if (Number(parsed.version) !== SAVE_BUNDLE_VERSION) throw new Error("Unsupported save bundle version.");
  if (!isObject(parsed.run) || !isObject(parsed.meta) || !isObject(parsed.settings)) {
    throw new Error("Save bundle is incomplete.");
  }
  if (!isObject(parsed.run.player) || !isObject(parsed.run.floor) || !Array.isArray(parsed.run.floor.rooms)) {
    throw new Error("Run payload is invalid.");
  }

  const payload = {
    run: parsed.run as unknown as GameSave,
    meta: parsed.meta as unknown as MetaProgress,
    settings: parsed.settings as unknown as GameSettings,
  };
  if (typeof parsed.checksum !== "string" || payloadChecksum(payload) !== parsed.checksum) {
    throw new Error("Save checksum mismatch.");
  }
  return payload;
}

export function isJsonObject(raw: string | null): boolean {
  if (!raw) return false;
  try {
    return isObject(JSON.parse(raw));
  } catch {
    return false;
  }
}
