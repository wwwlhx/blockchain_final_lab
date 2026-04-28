import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getFileMetadata } from "../utils/fileMeta.js";
import { calculateFileSha256 } from "../utils/hash.js";
import { createAssetMetadata, loadMetadataFromFile, savePendingMetadata } from "../utils/metadata.js";

export async function runFlowTests(
  ethers: any,
): Promise<void> {
  async function buildPreparedMetadata(filePath: string) {
    const fileMetadata = await getFileMetadata(filePath);
    const fileHash = await calculateFileSha256(filePath);
    const metadata = createAssetMetadata({
      fileMetadata,
      fileHash,
      assetName: "流程测试资产",
      description: "流程测试描述",
      rightsType: "original",
      assetCategory: "document",
      claimantAddress: "0x0000000000000000000000000000000000000001",
      createdAtLocal: "2026-04-24T10:00:00.000Z",
    });

    return {
      fileHash,
      metadata,
    };
  }

  {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "zzsy-flow-"));
    const filePath = path.join(tmpDir, "asset.txt");
    await writeFile(filePath, "flow-original-content", "utf8");

    const registry = await ethers.deployContract("AssetRegistry");
    const { fileHash, metadata } = await buildPreparedMetadata(filePath);
    const metadataUri = await savePendingMetadata(metadata);

    await registry.registerAsset(
      fileHash,
      metadata.metadataHash,
      metadataUri,
      metadata.metadata.rightsType,
    );

    const asset = await registry.getAsset(1n);
    const localFileHash = await calculateFileSha256(filePath);
    const localMetadata = await loadMetadataFromFile(metadataUri);

    assert.equal(asset.fileHash, localFileHash);
    assert.equal(asset.metadataHash, localMetadata.metadataHash);
    assert.equal(asset.status, 0n);
    await rm(path.resolve(metadataUri), { force: true });
    await rm(tmpDir, { recursive: true, force: true });
  }

  {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "zzsy-flow-"));
    const filePath = path.join(tmpDir, "asset.txt");
    await writeFile(filePath, "flow-original-content", "utf8");

    const registry = await ethers.deployContract("AssetRegistry");
    const { fileHash, metadata } = await buildPreparedMetadata(filePath);
    await registry.registerAsset(fileHash, metadata.metadataHash, "", "original");

    await writeFile(filePath, "flow-modified-content", "utf8");
    const modifiedFileHash = await calculateFileSha256(filePath);
    const asset = await registry.getAsset(1n);

    assert.notEqual(asset.fileHash, modifiedFileHash);
    await rm(tmpDir, { recursive: true, force: true });
  }

  {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "zzsy-flow-"));
    const filePath = path.join(tmpDir, "asset.txt");
    await writeFile(filePath, "flow-original-content", "utf8");

    const registry = await ethers.deployContract("AssetRegistry");
    const { fileHash, metadata } = await buildPreparedMetadata(filePath);
    await registry.registerAsset(fileHash, metadata.metadataHash, "", "original");

    const modifiedMetadata = createAssetMetadata({
      fileMetadata: await getFileMetadata(filePath),
      fileHash,
      assetName: "流程测试资产",
      description: "描述已被修改",
      rightsType: "original",
      assetCategory: "document",
      claimantAddress: "0x0000000000000000000000000000000000000001",
      createdAtLocal: "2026-04-24T10:00:00.000Z",
    });
    const asset = await registry.getAsset(1n);

    assert.notEqual(asset.metadataHash, modifiedMetadata.metadataHash);
    await rm(tmpDir, { recursive: true, force: true });
  }

  {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "zzsy-flow-"));
    const filePath = path.join(tmpDir, "asset.txt");
    await writeFile(filePath, "duplicate-content", "utf8");

    const registry = await ethers.deployContract("AssetRegistry");
    const { fileHash, metadata } = await buildPreparedMetadata(filePath);
    await registry.registerAsset(fileHash, metadata.metadataHash, "", "original");

    assert.equal(await registry.getAssetIdByFileHash(fileHash), 1n);
    await assert.rejects(
      registry.registerAsset(fileHash, metadata.metadataHash, "", "original"),
      /fileHash already registered/,
    );
    await rm(tmpDir, { recursive: true, force: true });
  }
}
