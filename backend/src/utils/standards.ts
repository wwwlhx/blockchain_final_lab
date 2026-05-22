export const SUPPORTED_RIGHTS_TYPES = ["original", "licensed", "assigned", "joint"] as const;
export type SupportedRightsType = (typeof SUPPORTED_RIGHTS_TYPES)[number];

export const RIGHTS_TYPE_LABELS: Record<SupportedRightsType, string> = {
  original: "原创确权",
  licensed: "授权使用",
  assigned: "权利受让",
  joint: "共同权属",
};

export const SUPPORTED_ASSET_CATEGORIES = [
  "document", "image", "audio", "video", "code", "dataset", "model", "other",
] as const;
export type SupportedAssetCategory = (typeof SUPPORTED_ASSET_CATEGORIES)[number];

export const ASSET_CATEGORY_LABELS: Record<SupportedAssetCategory, string> = {
  document: "文档", image: "图像", audio: "音频", video: "视频",
  code: "代码", dataset: "数据集", model: "模型", other: "其他",
};

function isIncluded<T extends readonly string[]>(list: T, value: string): value is T[number] {
  return list.includes(value);
}

export function normalizeRightsType(input: string | undefined): SupportedRightsType {
  const normalized = (input ?? "original").trim().toLowerCase();
  if (!isIncluded(SUPPORTED_RIGHTS_TYPES, normalized)) {
    throw new Error(`权利类型无效。当前支持: ${SUPPORTED_RIGHTS_TYPES.join(" / ")}`);
  }
  return normalized;
}

export function normalizeAssetCategory(input: string | undefined, fileExtension: string): SupportedAssetCategory {
  const normalized = (input ?? inferAssetCategory(fileExtension)).trim().toLowerCase();
  if (!isIncluded(SUPPORTED_ASSET_CATEGORIES, normalized)) {
    throw new Error(`资产类别无效。当前支持: ${SUPPORTED_ASSET_CATEGORIES.join(" / ")}`);
  }
  return normalized;
}

export function inferAssetCategory(fileExtension: string): SupportedAssetCategory {
  const ext = fileExtension.toLowerCase();
  if ([".txt", ".md", ".pdf", ".doc", ".docx"].includes(ext)) return "document";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext)) return "image";
  if ([".mp3", ".wav", ".flac", ".aac"].includes(ext)) return "audio";
  if ([".mp4", ".avi", ".mov", ".mkv"].includes(ext)) return "video";
  if ([".ts", ".js", ".py", ".java", ".sol", ".cpp", ".c"].includes(ext)) return "code";
  if ([".csv", ".json", ".xlsx", ".parquet"].includes(ext)) return "dataset";
  return "other";
}

export function formatRightsType(rightsType: string): string {
  if (isIncluded(SUPPORTED_RIGHTS_TYPES, rightsType)) {
    return `${rightsType} (${RIGHTS_TYPE_LABELS[rightsType]})`;
  }
  return rightsType;
}

export function formatAssetCategory(assetCategory: string): string {
  if (isIncluded(SUPPORTED_ASSET_CATEGORIES, assetCategory)) {
    return `${assetCategory} (${ASSET_CATEGORY_LABELS[assetCategory]})`;
  }
  return assetCategory;
}
