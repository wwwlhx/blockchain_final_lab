import { calculateFileSha256 } from "../utils/hash.js";
import { getFileMetadata } from "../utils/fileMeta.js";
import { inferAssetCategory } from "../utils/standards.js";

export interface FileUploadResult {
  filePath: string;
  fileName: string;
  fileHash: string;
  fileSize: number;
  extension: string;
  suggestedCategory: string;
}

export async function processUploadedFile(
  filePath: string,
  originalName: string
): Promise<FileUploadResult> {
  const fileHash = await calculateFileSha256(filePath);
  const fileMeta = await getFileMetadata(filePath);
  const suggestedCategory = inferAssetCategory(fileMeta.extension);

  return {
    filePath,
    fileName: originalName,
    fileHash,
    fileSize: fileMeta.sizeBytes,
    extension: fileMeta.extension,
    suggestedCategory,
  };
}
