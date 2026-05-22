import { getContract } from "./blockchain.service.js";
import { NotFoundError, AppError } from "../utils/errors.js";
import * as dao from "../database/dao.js";
import { calculateFileSha256 } from "../utils/hash.js";
import { getFileMetadata } from "../utils/fileMeta.js";
import { normalizeRightsType, normalizeAssetCategory, inferAssetCategory, formatRightsType } from "../utils/standards.js";
import { createAssetMetadata, savePendingMetadata, saveFinalMetadata, loadMetadataFromFile } from "../utils/metadata.js";

// ── 资产登记 ──
export interface RegisterInput {
  filePath: string;
  assetName: string;
  description?: string;
  rightsType?: string;
  assetCategory?: string;
}

export async function registerAsset(input: RegisterInput) {
  const { assetRegistry, signers } = await getContract();
  const signerAddress = await signers[0].getAddress();

  // 文件信息
  const fileMetadata = await getFileMetadata(input.filePath);
  const fileHash = await calculateFileSha256(input.filePath);

  // 规范化
  const normalizedRights = normalizeRightsType(input.rightsType || "original");
  const normalizedCategory = normalizeAssetCategory(
    input.assetCategory || inferAssetCategory(fileMetadata.extension),
    fileMetadata.extension
  );

  // 查重
  const existingId = await assetRegistry.getAssetIdByFileHash(fileHash);
  if (existingId !== 0n) {
    throw new AppError("该文件已被登记", 409);
  }

  // 创建元数据
  const prepared = createAssetMetadata({
    fileMetadata,
    fileHash,
    assetName: input.assetName,
    description: input.description || `资产 ${input.assetName} 的描述`,
    rightsType: normalizedRights,
    assetCategory: normalizedCategory,
    claimantAddress: signerAddress,
    createdAtLocal: new Date().toISOString(),
  });

  // 保存待定元数据
  const pendingPath = await savePendingMetadata(prepared);

  // 链上登记
  const tx = await assetRegistry.registerAsset(
    fileHash,
    prepared.metadataHash,
    pendingPath,
    normalizedRights
  );
  const receipt = await tx.wait();

  // 解析事件获取 assetId
  const iface = assetRegistry.interface;
  let assetId = 0n;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed?.name === "AssetRegistered") {
        assetId = parsed.args[0];
        break;
      }
    } catch {}
  }

  // 保存最终元数据
  const finalPath = await saveFinalMetadata(pendingPath, Number(assetId));

  const result = {
    assetId: Number(assetId),
    fileHash,
    metadataHash: prepared.metadataHash,
    metadataURI: finalPath,
    rightsType: normalizedRights,
    assetCategory: normalizedCategory,
    creator: signerAddress,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };

  // 写入链下数据库
  dao.insertAsset({
    id: result.assetId,
    file_hash: fileHash,
    metadata_hash: prepared.metadataHash,
    metadata_uri: finalPath,
    rights_type: normalizedRights,
    asset_category: normalizedCategory,
    creator: signerAddress,
    owner: signerAddress,
    status: 0,
    registered_at: Math.floor(Date.now() / 1000),
    tx_hash: receipt.hash,
    block_number: receipt.blockNumber,
  });

  dao.insertMetadata({
    asset_id: result.assetId,
    asset_name: input.assetName,
    description: input.description,
    asset_category: normalizedCategory,
    rights_type: normalizedRights,
    claimant_address: signerAddress,
    created_at_local: new Date().toISOString(),
    raw_json: JSON.stringify(prepared),
  });

  dao.insertTransaction({
    asset_id: result.assetId,
    type: "REGISTERED",
    operator: signerAddress,
    tx_hash: receipt.hash,
    block_number: receipt.blockNumber,
  });

  dao.insertLog("info", "REGISTER", `资产 #${result.assetId} 登记成功`, { assetId: result.assetId, fileHash });

  return result;
}

// ── 查询单个资产 ──
export async function getAssetById(assetId: number) {
  const { assetRegistry } = await getContract();

  let asset;
  try {
    asset = await assetRegistry.getAsset(BigInt(assetId));
  } catch (e: any) {
    if (e.message?.includes("asset does not exist")) {
      throw new NotFoundError("资产");
    }
    throw e;
  }

  let metadata = null;
  if (asset.metadataURI) {
    try {
      const prepared = await loadMetadataFromFile(asset.metadataURI);
      metadata = prepared.metadata;
    } catch {}
  }

  return {
    id: Number(asset.id),
    fileHash: asset.fileHash,
    metadataHash: asset.metadataHash,
    metadataURI: asset.metadataURI,
    rightsType: asset.rightsType,
    rightsTypeLabel: formatRightsType(asset.rightsType),
    creator: asset.creator,
    owner: asset.owner,
    registeredAt: Number(asset.registeredAt),
    registeredAtFormatted: new Date(Number(asset.registeredAt) * 1000).toLocaleString("zh-CN"),
    status: Number(asset.status),
    statusLabel: asset.status === 0n ? "Active" : "Revoked",
    metadata,
  };
}

// ── 列出所有资产 ──
export async function listAssets() {
  const { assetRegistry } = await getContract();

  const events = await assetRegistry.queryFilter(
    assetRegistry.filters.AssetRegistered(),
    0,
    "latest"
  );

  const assets = await Promise.all(
    events.map(async (event: any) => {
      const id = event.args[0];
      try {
        const asset = await assetRegistry.getAsset(id);
        return {
          id: Number(asset.id),
          fileHash: asset.fileHash.slice(0, 16) + "...",
          rightsType: asset.rightsType,
          creator: asset.creator,
          owner: asset.owner,
          status: Number(asset.status),
          statusLabel: asset.status === 0n ? "Active" : "Revoked",
          registeredAt: Number(asset.registeredAt),
        };
      } catch {
        return null;
      }
    })
  );

  const filtered = assets.filter(Boolean);
  return { assets: filtered.reverse(), total: filtered.length };
}

// ── 转移资产 ──
export async function transferAsset(assetId: number, newOwner: string) {
  const { assetRegistry } = await getContract();

  const assetBefore = await assetRegistry.getAsset(BigInt(assetId));
  const previousOwner = assetBefore.owner;

  const tx = await assetRegistry.transferAsset(BigInt(assetId), newOwner);
  const receipt = await tx.wait();

  // 同步链下数据库
  dao.updateAssetOwner(assetId, newOwner);
  dao.insertTransaction({
    asset_id: assetId,
    type: "TRANSFERRED",
    from_address: previousOwner,
    to_address: newOwner,
    tx_hash: receipt.hash,
    block_number: receipt.blockNumber,
  });
  dao.insertLog("info", "TRANSFER", `资产 #${assetId} 从 ${previousOwner} 转移至 ${newOwner}`);

  return {
    assetId,
    previousOwner,
    newOwner,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

// ── 撤销资产 ──
export async function revokeAsset(assetId: number) {
  const { assetRegistry, signers } = await getContract();

  const tx = await assetRegistry.revokeAsset(BigInt(assetId));
  const receipt = await tx.wait();

  const operator = await signers[0].getAddress();

  // 同步链下数据库
  dao.updateAssetStatus(assetId, 1);
  dao.insertTransaction({
    asset_id: assetId,
    type: "REVOKED",
    operator,
    tx_hash: receipt.hash,
    block_number: receipt.blockNumber,
  });
  dao.insertLog("info", "REVOKE", `资产 #${assetId} 已被撤销`, { operator });

  return {
    assetId,
    operator,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

// ── 资产历史 ──
export async function getAssetHistory(assetId: number) {
  const { assetRegistry } = await getContract();

  const [registered, transferred, revoked] = await Promise.all([
    assetRegistry.queryFilter(assetRegistry.filters.AssetRegistered(BigInt(assetId)), 0, "latest"),
    assetRegistry.queryFilter(assetRegistry.filters.AssetTransferred(BigInt(assetId)), 0, "latest"),
    assetRegistry.queryFilter(assetRegistry.filters.AssetRevoked(BigInt(assetId)), 0, "latest"),
  ]);

  const history: any[] = [];

  for (const event of registered) {
    const block = await event.getBlock();
    history.push({
      type: "REGISTERED",
      blockNumber: event.blockNumber,
      timestamp: block.timestamp,
      timestampFormatted: new Date(block.timestamp * 1000).toLocaleString("zh-CN"),
      transactionHash: event.transactionHash,
      data: { creator: (event as any).args[5], rightsType: (event as any).args[4] },
    });
  }

  for (const event of transferred) {
    const block = await event.getBlock();
    history.push({
      type: "TRANSFERRED",
      blockNumber: event.blockNumber,
      timestamp: block.timestamp,
      timestampFormatted: new Date(block.timestamp * 1000).toLocaleString("zh-CN"),
      transactionHash: event.transactionHash,
      data: { from: (event as any).args[1], to: (event as any).args[2] },
    });
  }

  for (const event of revoked) {
    const block = await event.getBlock();
    history.push({
      type: "REVOKED",
      blockNumber: event.blockNumber,
      timestamp: block.timestamp,
      timestampFormatted: new Date(block.timestamp * 1000).toLocaleString("zh-CN"),
      transactionHash: event.transactionHash,
      data: { operator: (event as any).args[1] },
    });
  }

  history.sort((a, b) => a.blockNumber - b.blockNumber);
  return { assetId, history, totalEvents: history.length };
}
