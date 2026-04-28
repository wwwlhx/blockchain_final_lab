import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FileMetadata } from "./fileMeta.js";
import { calculateSha256FromText } from "./hash.js";
import {
  METADATA_STANDARD,
  METADATA_VERSION,
  type SupportedAssetCategory,
  type SupportedRightsType,
} from "./standards.js";

export const HASH_ALGORITHM = "SHA-256";
const METADATA_DIR = path.resolve("metadata");

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

export interface PreparedMetadata {
  metadata: AssetMetadata;
  canonicalJson: string;
  metadataHash: string;
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortObjectKeys(nestedValue)]),
    );
  }

  return value;
}

export function toCanonicalJson(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value));
}

export function createAssetMetadata(input: CreateMetadataInput): PreparedMetadata {
  const assetName = input.assetName.trim();
  const rightsType = input.rightsType.trim();
  const description = (input.description ?? "").trim();

  if (assetName === "") {
    throw new Error("资产名称不能为空，请通过 --name 指定，或使用系统默认名称。");
  }

  if (rightsType === "") {
    throw new Error("权利类型不能为空，请通过 --rights 指定，例如 original。");
  }

  const metadata: AssetMetadata = {
    metadataStandard: METADATA_STANDARD,
    metadataVersion: METADATA_VERSION,
    assetName,
    description,
    assetCategory: input.assetCategory,
    originalFileName: input.fileMetadata.fileName,
    fileExtension: input.fileMetadata.extension,
    fileSize: input.fileMetadata.sizeBytes,
    fileHash: input.fileHash,
    hashAlgorithm: HASH_ALGORITHM,
    rightsType,
    claimantAddress: input.claimantAddress,
    createdAtLocal: input.createdAtLocal ?? new Date().toISOString(),
  };

  const canonicalJson = toCanonicalJson(metadata);
  const metadataHash = calculateSha256FromText(canonicalJson);

  return {
    metadata,
    canonicalJson,
    metadataHash,
  };
}

export async function savePendingMetadata(
  preparedMetadata: PreparedMetadata,
): Promise<string> {
  await mkdir(METADATA_DIR, { recursive: true });

  const filePath = path.join(
    METADATA_DIR,
    `pending-${Date.now().toString()}.json`,
  );

  await writeFile(filePath, `${preparedMetadata.canonicalJson}\n`, "utf8");
  return path.relative(process.cwd(), filePath);
}

export async function saveFinalMetadata(
  pendingMetadataPath: string,
  assetId: bigint,
): Promise<string> {
  await mkdir(METADATA_DIR, { recursive: true });

  const sourcePath = path.resolve(pendingMetadataPath);
  const targetPath = path.join(METADATA_DIR, `asset-${assetId.toString()}.json`);

  await copyFile(sourcePath, targetPath);
  return path.relative(process.cwd(), targetPath);
}

export async function loadMetadataFromFile(metadataPath: string): Promise<PreparedMetadata> {
  const absolutePath = path.resolve(metadataPath);

  let content: string;
  try {
    content = await readFile(absolutePath, "utf8");
  } catch {
    throw new Error(`metadata 文件不存在或无法读取: ${absolutePath}`);
  }

  let parsedMetadata: AssetMetadata;
  try {
    parsedMetadata = JSON.parse(content) as AssetMetadata;
  } catch {
    throw new Error(`metadata 文件不是合法 JSON: ${absolutePath}`);
  }

  const canonicalJson = toCanonicalJson(parsedMetadata);
  const metadataHash = calculateSha256FromText(canonicalJson);

  return {
    metadata: parsedMetadata,
    canonicalJson,
    metadataHash,
  };
}
