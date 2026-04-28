import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getFileMetadata } from "../utils/fileMeta.js";
import { calculateFileSha256 } from "../utils/hash.js";
import { createAssetMetadata } from "../utils/metadata.js";
import {
  METADATA_STANDARD,
  METADATA_VERSION,
} from "../utils/standards.js";

export async function runUtilityTests(): Promise<void> {
  {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "zzsy-meta-"));
    const filePath = path.join(tmpDir, "asset.txt");
    await writeFile(filePath, "same content", "utf8");

    const fileMetadata = await getFileMetadata(filePath);
    const fileHash = await calculateFileSha256(filePath);
    const createdAtLocal = "2026-04-24T10:00:00.000Z";

    const left = createAssetMetadata({
      fileMetadata,
      fileHash,
      assetName: "示例数字资产",
      description: "课程项目演示文件",
      rightsType: "original",
      assetCategory: "document",
      claimantAddress: "0x0000000000000000000000000000000000000001",
      createdAtLocal,
    });
    const right = createAssetMetadata({
      fileMetadata,
      fileHash,
      assetName: "示例数字资产",
      description: "课程项目演示文件",
      rightsType: "original",
      assetCategory: "document",
      claimantAddress: "0x0000000000000000000000000000000000000001",
      createdAtLocal,
    });

    assert.equal(left.canonicalJson, right.canonicalJson);
    assert.equal(left.metadataHash, right.metadataHash);
    assert.equal(left.metadata.metadataStandard, METADATA_STANDARD);
    assert.equal(left.metadata.metadataVersion, METADATA_VERSION);
    assert.equal(left.metadata.assetCategory, "document");
    await rm(tmpDir, { recursive: true, force: true });
  }

  {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "zzsy-meta-"));
    const filePath = path.join(tmpDir, "asset.txt");
    await writeFile(filePath, "same content", "utf8");

    const fileMetadata = await getFileMetadata(filePath);
    const fileHash = await calculateFileSha256(filePath);

    const originalMetadata = createAssetMetadata({
      fileMetadata,
      fileHash,
      assetName: "示例数字资产",
      description: "课程项目演示文件",
      rightsType: "original",
      assetCategory: "document",
      claimantAddress: "0x0000000000000000000000000000000000000001",
      createdAtLocal: "2026-04-24T10:00:00.000Z",
    });
    const modifiedMetadata = createAssetMetadata({
      fileMetadata,
      fileHash,
      assetName: "示例数字资产",
      description: "描述已修改",
      rightsType: "original",
      assetCategory: "document",
      claimantAddress: "0x0000000000000000000000000000000000000001",
      createdAtLocal: "2026-04-24T10:00:00.000Z",
    });

    assert.notEqual(originalMetadata.metadataHash, modifiedMetadata.metadataHash);
    await rm(tmpDir, { recursive: true, force: true });
  }

  {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "zzsy-hash-"));
    const filePath = path.join(tmpDir, "asset.txt");
    await writeFile(filePath, "version-1", "utf8");
    const leftHash = await calculateFileSha256(filePath);

    await writeFile(filePath, "version-2", "utf8");
    const rightHash = await calculateFileSha256(filePath);

    assert.notEqual(leftHash, rightHash);
    await rm(tmpDir, { recursive: true, force: true });
  }

  {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "zzsy-meta-"));
    const filePath = path.join(tmpDir, "asset.txt");
    const metadataPath = path.join(tmpDir, "asset-metadata.json");
    await writeFile(filePath, "same content", "utf8");

    const fileMetadata = await getFileMetadata(filePath);
    const fileHash = await calculateFileSha256(filePath);
    const metadata = createAssetMetadata({
      fileMetadata,
      fileHash,
      assetName: "示例数字资产",
      description: "课程项目演示文件",
      rightsType: "original",
      assetCategory: "document",
      claimantAddress: "0x0000000000000000000000000000000000000001",
      createdAtLocal: "2026-04-24T10:00:00.000Z",
    });

    await writeFile(metadataPath, metadata.canonicalJson, "utf8");
    const persistedContent = await readFile(metadataPath, "utf8");
    assert.equal(persistedContent, metadata.canonicalJson);
    await rm(tmpDir, { recursive: true, force: true });
  }
}
