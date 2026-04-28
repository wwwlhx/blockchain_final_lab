import { stat } from "node:fs/promises";
import path from "node:path";

import { ensureFileReadable } from "./hash.js";

export interface FileMetadata {
  absolutePath: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
}

export async function getFileMetadata(filePath: string): Promise<FileMetadata> {
  const absolutePath = await ensureFileReadable(filePath);

  let fileStat;
  try {
    fileStat = await stat(absolutePath);
  } catch {
    throw new Error(`无法获取文件元数据: ${absolutePath}`);
  }

  if (!fileStat.isFile()) {
    throw new Error(`目标路径不是普通文件: ${absolutePath}`);
  }

  if (fileStat.size === 0) {
    throw new Error(`文件为空，无法登记或校验: ${absolutePath}`);
  }

  return {
    absolutePath,
    fileName: path.basename(absolutePath),
    extension: path.extname(absolutePath) || "(无扩展名)",
    sizeBytes: fileStat.size,
  };
}
