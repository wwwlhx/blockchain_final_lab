const MOJIBAKE_RE = /[ÃÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöùúûüýþÿ]/;

export function decodeUploadFileName(fileName: string): string {
  if (!MOJIBAKE_RE.test(fileName)) return fileName;

  try {
    const decoded = Buffer.from(fileName, "latin1").toString("utf8");
    return decoded.includes("\uFFFD") ? fileName : decoded;
  } catch {
    return fileName;
  }
}

export function sanitizeStoredFileName(fileName: string): string {
  return decodeUploadFileName(fileName)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || "uploaded-file";
}
