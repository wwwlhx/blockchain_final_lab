import { ethers } from "ethers";

import { getContract } from "./blockchain.service.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import * as dao from "../database/dao.js";
import { calculateFileSha256 } from "../utils/hash.js";
import { getFileMetadata } from "../utils/fileMeta.js";
import {
  normalizeRightsType,
  normalizeAssetCategory,
  inferAssetCategory,
} from "../utils/standards.js";
import {
  createAssetMetadata,
  savePendingMetadata,
  saveFinalMetadata,
  loadMetadataFromFile,
} from "../utils/metadata.js";

export interface WalletRegisterInput {
  filePath: string;
  assetName: string;
  description?: string;
  rightsType?: string;
  assetCategory?: string;
  claimantAddress: string;
}

export async function prepareRegistration(input: WalletRegisterInput) {
  if (!ethers.isAddress(input.claimantAddress)) {
    throw new AppError("钱包地址格式错误", 400);
  }

  const { assetRegistry } = await getContract();
  const fileMetadata = await getFileMetadata(input.filePath);
  const fileHash = await calculateFileSha256(input.filePath);
  const normalizedRights = normalizeRightsType(input.rightsType || "original");
  const normalizedCategory = normalizeAssetCategory(
    input.assetCategory || inferAssetCategory(fileMetadata.extension),
    fileMetadata.extension
  );

  if ((await assetRegistry.getAssetIdByFileHash(fileHash)) !== 0n) {
    throw new AppError("该文件已被登记", 409);
  }

  const prepared = createAssetMetadata({
    fileMetadata,
    fileHash,
    assetName: input.assetName,
    description: input.description || `资产 ${input.assetName} 的描述`,
    rightsType: normalizedRights,
    assetCategory: normalizedCategory,
    claimantAddress: input.claimantAddress,
    createdAtLocal: new Date().toISOString(),
  });
  const pendingPath = await savePendingMetadata(prepared);

  return {
    fileHash,
    metadataHash: prepared.metadataHash,
    metadataURI: pendingPath,
    rightsType: normalizedRights,
    assetCategory: normalizedCategory,
    metadata: prepared.metadata,
  };
}

export async function confirmRegistration(input: {
  transactionHash: string;
  assetName: string;
  description?: string;
  assetCategory?: string;
}) {
  const { provider, assetRegistry } = await getContract();
  const receipt = await provider.getTransactionReceipt(input.transactionHash);
  if (!receipt || receipt.status !== 1) throw new AppError("交易尚未确认或执行失败", 400);

  let event: any = null;
  for (const log of receipt.logs) {
    try {
      const parsed = assetRegistry.interface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed?.name === "AssetRegistered") {
        event = parsed;
        break;
      }
    } catch {}
  }
  if (!event) throw new AppError("交易中未找到 AssetRegistered 事件", 400);

  const assetId = Number(event.args.assetId);
  const asset = await assetRegistry.getAsset(BigInt(assetId));
  const block = await provider.getBlock(receipt.blockNumber);
  const finalPath = await saveFinalMetadata(asset.metadataURI, assetId);
  let metadata: any = null;
  try {
    metadata = (await loadMetadataFromFile(finalPath)).metadata;
  } catch {}

  dao.insertAsset({
    id: assetId,
    file_hash: asset.fileHash,
    metadata_hash: asset.metadataHash,
    metadata_uri: finalPath,
    rights_type: asset.rightsType,
    asset_category: input.assetCategory || metadata?.assetCategory,
    creator: asset.creator,
    owner: asset.owner,
    status: Number(asset.status),
    registered_at: Number(asset.registeredAt),
    tx_hash: receipt.hash,
    block_number: receipt.blockNumber,
  });
  dao.insertMetadata({
    asset_id: assetId,
    asset_name: input.assetName || metadata?.assetName || `资产 #${assetId}`,
    description: input.description ?? metadata?.description,
    asset_category: input.assetCategory || metadata?.assetCategory,
    original_filename: metadata?.originalFileName,
    file_extension: metadata?.fileExtension,
    file_size: metadata?.fileSize,
    rights_type: asset.rightsType,
    claimant_address: asset.creator,
    created_at_local: metadata?.createdAtLocal,
    raw_json: metadata ? JSON.stringify(metadata) : undefined,
  });
  dao.insertTransaction({
    asset_id: assetId,
    type: "REGISTERED",
    operator: asset.creator,
    tx_hash: receipt.hash,
    block_number: receipt.blockNumber,
    block_timestamp: block?.timestamp,
  });
  dao.insertLog("info", "REGISTER_WALLET", `资产 #${assetId} 已由钱包签名登记`, {
    creator: asset.creator,
    transactionHash: receipt.hash,
  });

  return {
    assetId,
    fileHash: asset.fileHash,
    metadataHash: asset.metadataHash,
    metadataURI: finalPath,
    rightsType: asset.rightsType,
    assetCategory: input.assetCategory || metadata?.assetCategory,
    creator: asset.creator,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    status: receipt.status,
    timestamp: block?.timestamp ?? null,
  };
}

export async function confirmAction(input: {
  transactionHash: string;
  expectedType: "TRANSFERRED" | "REVOKED";
}) {
  const { provider, assetRegistry } = await getContract();
  const receipt = await provider.getTransactionReceipt(input.transactionHash);
  if (!receipt || receipt.status !== 1) throw new AppError("交易尚未确认或执行失败", 400);

  let event: any = null;
  for (const log of receipt.logs) {
    try {
      const parsed = assetRegistry.interface.parseLog({ topics: [...log.topics], data: log.data });
      if (
        (input.expectedType === "TRANSFERRED" && parsed?.name === "AssetTransferred") ||
        (input.expectedType === "REVOKED" && parsed?.name === "AssetRevoked")
      ) {
        event = parsed;
        break;
      }
    } catch {}
  }
  if (!event) throw new AppError("交易事件与预期操作不匹配", 400);

  const assetId = Number(event.args.assetId);
  const block = await provider.getBlock(receipt.blockNumber);
  if (input.expectedType === "TRANSFERRED") {
    dao.updateAssetOwner(assetId, event.args.newOwner);
    dao.insertTransaction({
      asset_id: assetId,
      type: "TRANSFERRED",
      from_address: event.args.previousOwner,
      to_address: event.args.newOwner,
      operator: event.args.previousOwner,
      tx_hash: receipt.hash,
      block_number: receipt.blockNumber,
      block_timestamp: block?.timestamp,
    });
  } else {
    dao.updateAssetStatus(assetId, 1);
    dao.insertTransaction({
      asset_id: assetId,
      type: "REVOKED",
      operator: event.args.operator,
      tx_hash: receipt.hash,
      block_number: receipt.blockNumber,
      block_timestamp: block?.timestamp,
    });
  }

  dao.insertLog("info", `WALLET_${input.expectedType}`, `资产 #${assetId} 钱包交易已同步`, {
    transactionHash: receipt.hash,
  });
  return getTransactionDetails(receipt.hash);
}

export async function getTransactionDetails(transactionHash: string) {
  const { provider } = await getContract();
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(transactionHash),
    provider.getTransactionReceipt(transactionHash),
  ]);
  if (!tx || !receipt) throw new NotFoundError("交易");
  const block = await provider.getBlock(receipt.blockNumber);
  const gasPrice = receipt.gasPrice ?? tx.gasPrice;
  return {
    transactionHash,
    status: receipt.status,
    blockNumber: receipt.blockNumber,
    from: tx.from,
    to: tx.to,
    gasUsed: receipt.gasUsed.toString(),
    gasPrice: gasPrice?.toString() ?? null,
    fee: gasPrice ? ethers.formatEther(receipt.gasUsed * gasPrice) : null,
    timestamp: block?.timestamp ?? null,
    timestampFormatted: block ? new Date(block.timestamp * 1000).toLocaleString("zh-CN") : null,
  };
}

export async function syncFromChain() {
  const { provider, assetRegistry } = await getContract();
  const [registered, transferred, revoked] = await Promise.all([
    assetRegistry.queryFilter(assetRegistry.filters.AssetRegistered(), 0, "latest"),
    assetRegistry.queryFilter(assetRegistry.filters.AssetTransferred(), 0, "latest"),
    assetRegistry.queryFilter(assetRegistry.filters.AssetRevoked(), 0, "latest"),
  ]);

  dao.clearIndexedData();
  for (const event of registered as any[]) {
    const assetId = Number(event.args.assetId);
    const asset = await assetRegistry.getAsset(BigInt(assetId));
    const block = await event.getBlock();
    let metadata: any = null;
    try {
      metadata = (await loadMetadataFromFile(asset.metadataURI)).metadata;
    } catch {}
    dao.insertAsset({
      id: assetId,
      file_hash: asset.fileHash,
      metadata_hash: asset.metadataHash,
      metadata_uri: asset.metadataURI,
      rights_type: asset.rightsType,
      asset_category: metadata?.assetCategory,
      creator: asset.creator,
      owner: asset.owner,
      status: Number(asset.status),
      registered_at: Number(asset.registeredAt),
      tx_hash: event.transactionHash,
      block_number: event.blockNumber,
    });
    dao.insertMetadata({
      asset_id: assetId,
      asset_name: metadata?.assetName || `链上资产 #${assetId}`,
      description: metadata?.description,
      asset_category: metadata?.assetCategory,
      original_filename: metadata?.originalFileName,
      file_extension: metadata?.fileExtension,
      file_size: metadata?.fileSize,
      rights_type: asset.rightsType,
      claimant_address: asset.creator,
      created_at_local: metadata?.createdAtLocal,
      raw_json: metadata ? JSON.stringify(metadata) : undefined,
    });
    dao.insertTransaction({
      asset_id: assetId,
      type: "REGISTERED",
      operator: asset.creator,
      tx_hash: event.transactionHash,
      block_number: event.blockNumber,
      block_timestamp: block.timestamp,
    });
  }
  for (const event of transferred as any[]) {
    const block = await event.getBlock();
    dao.insertTransaction({
      asset_id: Number(event.args.assetId),
      type: "TRANSFERRED",
      from_address: event.args.previousOwner,
      to_address: event.args.newOwner,
      operator: event.args.previousOwner,
      tx_hash: event.transactionHash,
      block_number: event.blockNumber,
      block_timestamp: block.timestamp,
    });
  }
  for (const event of revoked as any[]) {
    const block = await event.getBlock();
    dao.insertTransaction({
      asset_id: Number(event.args.assetId),
      type: "REVOKED",
      operator: event.args.operator,
      tx_hash: event.transactionHash,
      block_number: event.blockNumber,
      block_timestamp: block.timestamp,
    });
  }
  dao.insertLog("info", "CHAIN_SYNC", `已从链上重建 ${registered.length} 条资产索引`);
  return {
    assets: registered.length,
    transfers: transferred.length,
    revocations: revoked.length,
    blockNumber: await provider.getBlockNumber(),
  };
}
