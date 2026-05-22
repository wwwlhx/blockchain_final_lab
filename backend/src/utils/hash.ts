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

export async function calculateFileSha256(filePath: string): Promise<string> {
  const absolutePath = await ensureFileReadable(filePath);
  const fileBuffer = await readFile(absolutePath);
  return createHash("sha256").update(fileBuffer).digest("hex");
}
