import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { calculateSha256FromText } from "./hash.js";
import type { FileMetadata } from "./fileMeta.js";
import type { SupportedAssetCategory, SupportedRightsType } from "./standards.js";
import { config } from "../config/index.js";

const METADATA_STANDARD = "zzsy-asset-metadata-v1";
const METADATA_VERSION = "1.1";
const HASH_ALGORITHM = "SHA-256";

export interface AssetMetadata {
  metadataStandard: string;
  metadataVersion: string;
  assetName: string;
  description: string;
  assetCategory: string;
  originalFileName: string;
  fileExtension: string;
  fileSize: number;
  fileHash: string;
  hashAlgorithm: string;
  rightsType: string;
  claimantAddress: string;
  createdAtLocal: string;
}

export interface PreparedMetadata {
  metadata: AssetMetadata;
  canonicalJson: string;
  metadataHash: string;
}

export interface CreateMetadataInput {
  fileMetadata: FileMetadata;
  fileHash: string;
  assetName: string;
  description?: string;
  rightsType: SupportedRightsType;
  assetCategory: SupportedAssetCategory;
  claimantAddress: string;
  createdAtLocal?: string;
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortObjectKeys(v)])
    );
  }
  return value;
}

export function toCanonicalJson(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value));
}

export function createAssetMetadata(input: CreateMetadataInput): PreparedMetadata {
  const assetName = input.assetName.trim();
  if (!assetName) throw new Error("资产名称不能为空");

  const metadata: AssetMetadata = {
    metadataStandard: METADATA_STANDARD,
    metadataVersion: METADATA_VERSION,
    assetName,
    description: (input.description ?? "").trim(),
    assetCategory: input.assetCategory,
    originalFileName: input.fileMetadata.fileName,
    fileExtension: input.fileMetadata.extension,
    fileSize: input.fileMetadata.sizeBytes,
    fileHash: input.fileHash,
    hashAlgorithm: HASH_ALGORITHM,
    rightsType: input.rightsType,
    claimantAddress: input.claimantAddress,
    createdAtLocal: input.createdAtLocal ?? new Date().toISOString(),
  };

  const canonicalJson = toCanonicalJson(metadata);
  const metadataHash = calculateSha256FromText(canonicalJson);
  return { metadata, canonicalJson, metadataHash };
}

function getMetadataDir(): string {
  return path.resolve(config.contractsDir, "metadata");
}

export async function savePendingMetadata(prepared: PreparedMetadata): Promise<string> {
  const dir = getMetadataDir();
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `pending-${Date.now()}.json`);
  await writeFile(filePath, `${prepared.canonicalJson}\n`, "utf-8");
  return filePath;
}

export async function saveFinalMetadata(pendingPath: string, assetId: number): Promise<string> {
  const dir = getMetadataDir();
  await mkdir(dir, { recursive: true });
  const targetPath = path.join(dir, `asset-${assetId}.json`);
  await copyFile(path.resolve(pendingPath), targetPath);
  return targetPath;
}

export async function loadMetadataFromFile(metadataPath: string): Promise<PreparedMetadata> {
  const absolutePath = path.resolve(metadataPath);
  let content: string;
  try {
    content = await readFile(absolutePath, "utf-8");
  } catch {
    throw new Error(`metadata 文件不存在或无法读取: ${absolutePath}`);
  }

  let parsed: AssetMetadata;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`metadata 文件不是合法 JSON: ${absolutePath}`);
  }

  const canonicalJson = toCanonicalJson(parsed);
  const metadataHash = calculateSha256FromText(canonicalJson);
  return { metadata: parsed, canonicalJson, metadataHash };
}
