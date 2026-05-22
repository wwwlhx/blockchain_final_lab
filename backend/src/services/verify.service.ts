import { getContract } from "./blockchain.service.js";
import * as dao from "../database/dao.js";
import { calculateFileSha256 } from "../utils/hash.js";
import { loadMetadataFromFile } from "../utils/metadata.js";

export interface VerifyResult {
  assetId: number;
  chainFileHash: string;
  localFileHash: string;
  fileHashMatch: boolean;
  chainMetadataHash: string;
  localMetadataHash: string | null;
  metadataHashMatch: boolean | null;
  overallResult: boolean;
  message: string;
}

export async function verifyAsset(
  assetId: number,
  filePath: string,
  metadataPath?: string
): Promise<VerifyResult> {
  const { assetRegistry } = await getContract();

  const asset = await assetRegistry.getAsset(BigInt(assetId));
  const localFileHash = await calculateFileSha256(filePath);
  const fileHashMatch = localFileHash === asset.fileHash;

  let metadataHashMatch: boolean | null = null;
  let localMetadataHash: string | null = null;

  if (metadataPath) {
    try {
      const prepared = await loadMetadataFromFile(metadataPath);
      localMetadataHash = prepared.metadataHash;
      metadataHashMatch = localMetadataHash === asset.metadataHash;
    } catch (e: any) {
      return {
        assetId,
        chainFileHash: asset.fileHash,
        localFileHash,
        fileHashMatch,
        chainMetadataHash: asset.metadataHash,
        localMetadataHash: null,
        metadataHashMatch: null,
        overallResult: false,
        message: `无法读取元数据文件: ${e.message}`,
      };
    }
  }

  const overallResult = fileHashMatch && (metadataHashMatch === null || metadataHashMatch);

  const result: VerifyResult = {
    assetId,
    chainFileHash: asset.fileHash,
    localFileHash,
    fileHashMatch,
    chainMetadataHash: asset.metadataHash,
    localMetadataHash,
    metadataHashMatch,
    overallResult,
    message: overallResult
      ? "✓ 验证通过，文件和声明均未被篡改"
      : "✗ 验证失败，文件或声明已被修改",
  };

  // 写入校验记录
  dao.insertVerification({
    asset_id: assetId,
    file_path: filePath,
    local_file_hash: localFileHash,
    chain_file_hash: asset.fileHash,
    file_match: fileHashMatch,
    metadata_match: metadataHashMatch,
    overall_result: overallResult,
  });
  dao.insertLog("info", "VERIFY", `资产 #${assetId} 校验${overallResult ? "通过" : "失败"}`);

  return result;
}
