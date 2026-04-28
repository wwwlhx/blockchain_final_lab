import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

export async function ensureFileReadable(filePath: string): Promise<string> {
  const absolutePath = path.resolve(filePath);

  try {
    await access(absolutePath);
  } catch {
    throw new Error(`文件不存在或无法访问: ${absolutePath}`);
  }

  return absolutePath;
}

export function calculateSha256FromText(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function calculateSha256FromBuffer(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function calculateFileSha256(filePath: string): Promise<string> {
  const absolutePath = await ensureFileReadable(filePath);

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(absolutePath);
  } catch {
    throw new Error(`文件读取失败: ${absolutePath}`);
  }

  return calculateSha256FromBuffer(fileBuffer);
}
