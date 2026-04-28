import { access } from "node:fs/promises";
import path from "node:path";

import type { ContractTransactionReceipt, LogDescription } from "ethers";

import {
  formatAssetStatus,
  formatErrorMessage,
  formatLocalDate,
  formatTimestamp,
  printBanner,
  printField,
  printHint,
  printSection,
  printStatus,
} from "./cli.js";
import { getCurrentNetworkName } from "./config.js";
import { connectToAssetRegistry } from "./contract.js";
import { getFileMetadata } from "./fileMeta.js";
import { calculateFileSha256 } from "./hash.js";
import {
  createAssetMetadata,
  loadMetadataFromFile,
  saveFinalMetadata,
  savePendingMetadata,
} from "./metadata.js";
import {
  formatAssetCategory,
  formatRightsType,
  normalizeAssetCategory,
  normalizeRightsType,
} from "./standards.js";

interface ChainAssetRecord {
  id: bigint;
  fileHash: string;
  metadataHash: string;
  metadataURI: string;
  rightsType: string;
  creator: string;
  owner: string;
  registeredAt: bigint;
  status: bigint;
}

interface RegisterFileOptions {
  file: string;
  assetName?: string;
  description?: string;
  rightsType?: string;
  assetCategory?: string;
  networkName?: string;
}

interface VerifyAssetOptions {
  assetIdInput: string;
  filePath: string;
  metadataPath?: string;
  networkName?: string;
}

interface AssetHistoryRecord {
  blockNumber: number;
  transactionHash: string;
  timestamp: bigint;
  action: "REGISTERED" | "TRANSFERRED" | "REVOKED";
  summary: string;
}

function normalizeAssetName(assetName: string | undefined, fileName: string): string {
  const normalized = (assetName ?? "").trim();
  if (normalized !== "") {
    return normalized;
  }

  return `数字资产-${fileName}`;
}

function normalizeDescription(description: string | undefined): string {
  return (description ?? "结构化数字资产确权登记记录").trim();
}

export function parseAssetId(input: string | undefined): bigint {
  if (!input) {
    throw new Error("缺少资产 ID 参数，请输入正整数，例如 1。");
  }

  let assetId: bigint;
  try {
    assetId = BigInt(input);
  } catch {
    throw new Error("资产 ID 格式错误，请输入正整数，例如 1。");
  }

  if (assetId <= 0n) {
    throw new Error("资产 ID 必须为正整数。");
  }

  return assetId;
}

function parseChainAsset(asset: ChainAssetRecord | Record<string, unknown>): ChainAssetRecord {
  const parsedAsset = asset as ChainAssetRecord;
  return {
    id: parsedAsset.id,
    fileHash: parsedAsset.fileHash,
    metadataHash: parsedAsset.metadataHash,
    metadataURI: parsedAsset.metadataURI,
    rightsType: parsedAsset.rightsType,
    creator: parsedAsset.creator,
    owner: parsedAsset.owner,
    registeredAt: parsedAsset.registeredAt,
    status: parsedAsset.status,
  };
}

async function ensureAssetExists(assetRegistry: any, assetId: bigint): Promise<ChainAssetRecord> {
  try {
    return parseChainAsset(await assetRegistry.getAsset(assetId));
  } catch (error) {
    const message = formatErrorMessage(error);
    if (message.includes("资产不存在") || message.includes("asset does not exist")) {
      throw new Error(`assetId=${assetId.toString()} 不存在，请确认查询编号是否正确。`);
    }

    throw new Error(`读取链上资产失败: ${message}`);
  }
}

function parseEvent(
  receipt: ContractTransactionReceipt,
  contractInterface: { parseLog(log: unknown): LogDescription | null },
  eventName: string,
): LogDescription {
  const parsedEvent = receipt.logs
    .map((log) => {
      try {
        return contractInterface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((logDescription) => logDescription?.name === eventName);

  if (!parsedEvent) {
    throw new Error(`交易成功，但没有解析到 ${eventName} 事件。`);
  }

  return parsedEvent;
}

function printStructuredAssetRecord(asset: ChainAssetRecord): void {
  printField("资产 ID", asset.id.toString());
  printField("文件哈希", asset.fileHash);
  printField("元数据哈希", asset.metadataHash);
  printField("元数据 URI", asset.metadataURI || "(空)");
  printField("权利类型", formatRightsType(asset.rightsType));
  printField("创建者", asset.creator);
  printField("当前所有者", asset.owner);
  printField(
    "登记时间",
    `${asset.registeredAt.toString()} (${formatTimestamp(asset.registeredAt)})`,
  );
  printField("资产状态", formatAssetStatus(asset.status));
}

async function tryPrintMetadataSummary(metadataUri: string): Promise<void> {
  if (metadataUri.trim() === "") {
    return;
  }

  const absolutePath = path.resolve(metadataUri);
  try {
    await access(absolutePath);
  } catch {
    printStatus("WARN", `metadataURI 指向的本地文件不存在: ${absolutePath}`);
    return;
  }

  try {
    const preparedMetadata = await loadMetadataFromFile(metadataUri);
    printSection("元数据摘要");
    printField("元数据文件", absolutePath);
    printField("元数据标准", preparedMetadata.metadata.metadataStandard);
    printField("元数据版本", preparedMetadata.metadata.metadataVersion);
    printField("资产名称", preparedMetadata.metadata.assetName);
    printField("资产描述", preparedMetadata.metadata.description || "(空)");
    printField("资产类别", formatAssetCategory(preparedMetadata.metadata.assetCategory));
    printField("权利类型", formatRightsType(preparedMetadata.metadata.rightsType));
    printField("原始文件名", preparedMetadata.metadata.originalFileName);
    printField("文件扩展名", preparedMetadata.metadata.fileExtension);
    printField("文件大小", `${preparedMetadata.metadata.fileSize} bytes`);
    printField("声明地址", preparedMetadata.metadata.claimantAddress);
    printField("创建时间", formatLocalDate(preparedMetadata.metadata.createdAtLocal));
  } catch (error) {
    printStatus("WARN", `无法读取 metadata 摘要: ${formatErrorMessage(error)}`);
  }
}

export async function registerFileCommand(options: RegisterFileOptions): Promise<void> {
  const networkName = options.networkName ?? getCurrentNetworkName();
  const fileMetadata = await getFileMetadata(options.file);
  const rightsType = normalizeRightsType(options.rightsType);
  const assetCategory = normalizeAssetCategory(options.assetCategory, fileMetadata.extension);
  const assetName = normalizeAssetName(options.assetName, fileMetadata.fileName);
  const description = normalizeDescription(options.description);
  const fileHash = await calculateFileSha256(options.file);
  const { assetRegistry, deployment, ethers } = await connectToAssetRegistry(networkName);
  const signer = await ethers.provider.getSigner();
  const claimantAddress = await signer.getAddress();

  const existingAssetId = await assetRegistry.getAssetIdByFileHash(fileHash);
  if (existingAssetId !== 0n) {
    printBanner("数字资产确权系统原型 - 结构化资产登记");
    printSection("重复登记检测");
    printField("文件路径", fileMetadata.absolutePath);
    printField("文件哈希", fileHash);
    printField("已有资产 ID", existingAssetId.toString());
    printStatus("ERROR", "该文件内容已登记，已拦截重复确权请求。");
    printHint("可执行 npm run query:asset -- --asset-id <已有资产 ID> 查看详情。");
    process.exitCode = 1;
    return;
  }

  const preparedMetadata = createAssetMetadata({
    fileMetadata,
    fileHash,
    assetName,
    description,
    rightsType,
    assetCategory,
    claimantAddress,
  });
  const pendingMetadataPath = await savePendingMetadata(preparedMetadata);

  printBanner("数字资产确权系统原型 - 结构化资产登记");
  printSection("文件信息");
  printField("网络", networkName);
  printField("合约地址", deployment.contractAddress);
  printField("文件路径", fileMetadata.absolutePath);
  printField("文件名", fileMetadata.fileName);
  printField("文件大小", `${fileMetadata.sizeBytes} bytes`);
  printField("文件哈希", fileHash);

  printSection("元数据");
  printField("元数据标准", preparedMetadata.metadata.metadataStandard);
  printField("元数据版本", preparedMetadata.metadata.metadataVersion);
  printField("资产名称", preparedMetadata.metadata.assetName);
  printField("资产描述", preparedMetadata.metadata.description || "(空)");
  printField("资产类别", formatAssetCategory(preparedMetadata.metadata.assetCategory));
  printField("权利类型", formatRightsType(preparedMetadata.metadata.rightsType));
  printField("声明地址", preparedMetadata.metadata.claimantAddress);
  printField("元数据哈希", preparedMetadata.metadataHash);
  printField("元数据 URI", pendingMetadataPath);
  printField("创建时间", formatLocalDate(preparedMetadata.metadata.createdAtLocal));

  printSection("链上登记");
  printStatus("INFO", "正在调用 registerAsset(fileHash, metadataHash, metadataURI, rightsType) ...");

  let tx;
  try {
    tx = await assetRegistry.registerAsset(
      fileHash,
      preparedMetadata.metadataHash,
      pendingMetadataPath,
      rightsType,
    );
  } catch (error) {
    throw new Error(
      `调用 registerAsset 失败: ${translateContractError(formatErrorMessage(error))}`,
    );
  }

  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("交易已发送，但未拿到回执。");
  }

  const registerEvent = parseEvent(receipt, assetRegistry.interface, "AssetRegistered");
  const assetId = registerEvent.args.assetId as bigint;
  const finalMetadataPath = await saveFinalMetadata(pendingMetadataPath, assetId);
  const asset = await ensureAssetExists(assetRegistry, assetId);

  printSection("链上确权结果");
  printStatus("SUCCESS", "结构化资产确权登记成功。");
  printField("交易哈希", receipt.hash);
  printField("区块号", receipt.blockNumber.toString());
  printField("Gas Used", receipt.gasUsed.toString());
  printStructuredAssetRecord(asset);
  printField("元数据文件", finalMetadataPath);
  printHint("登记前会自动做重复文件检测。请记录 assetId，后续查询、校验、历史追溯、转移和撤销都需要使用该编号。");
}

export async function queryAssetCommand(
  assetIdInput: string,
  networkName = getCurrentNetworkName(),
): Promise<void> {
  const assetId = parseAssetId(assetIdInput);
  const { assetRegistry, deployment } = await connectToAssetRegistry(networkName);
  const asset = await ensureAssetExists(assetRegistry, assetId);

  printBanner("数字资产确权系统原型 - 结构化资产查询");
  printSection("链上确权记录");
  printStatus("SUCCESS", "已成功读取链上资产记录。");
  printField("网络", networkName);
  printField("合约地址", deployment.contractAddress);
  printStructuredAssetRecord(asset);
  await tryPrintMetadataSummary(asset.metadataURI);
  printHint("推荐继续执行 verify:asset 做双重校验，或执行 history:asset 查看完整资产历史。");
}

export async function verifyAssetCommand(options: VerifyAssetOptions): Promise<void> {
  const networkName = options.networkName ?? getCurrentNetworkName();
  const assetId = parseAssetId(options.assetIdInput);
  const fileMetadata = await getFileMetadata(options.filePath);
  const localFileHash = await calculateFileSha256(options.filePath);
  const { assetRegistry, deployment } = await connectToAssetRegistry(networkName);
  const asset = await ensureAssetExists(assetRegistry, assetId);

  let metadataHashResult = "未提供";
  let localMetadataHash = "(未提供)";
  let chainMetadataHash = asset.metadataHash;

  if (options.metadataPath) {
    const metadataInfo = await loadMetadataFromFile(options.metadataPath);
    localMetadataHash = metadataInfo.metadataHash;
    metadataHashResult = metadataInfo.metadataHash === asset.metadataHash ? "通过" : "失败";
  }

  const fileHashResult = localFileHash === asset.fileHash ? "通过" : "失败";

  printBanner("数字资产确权系统原型 - 结构化资产校验");
  printSection("校验输入");
  printField("网络", networkName);
  printField("合约地址", deployment.contractAddress);
  printField("资产 ID", assetId.toString());
  printField("文件路径", fileMetadata.absolutePath);
  printField("文件名", fileMetadata.fileName);
  printField("文件大小", `${fileMetadata.sizeBytes} bytes`);
  printField(
    "metadata 文件",
    options.metadataPath ? path.resolve(options.metadataPath) : "(未提供)",
  );

  printSection("文件内容指纹校验");
  printField("本地文件哈希", localFileHash);
  printField("链上文件哈希", asset.fileHash);
  printField("文件内容校验", fileHashResult);

  printSection("元数据声明校验");
  printField("本地元数据哈希", localMetadataHash);
  printField("链上元数据哈希", chainMetadataHash);
  printField("元数据校验", metadataHashResult);

  printSection("权属状态");
  printField("资产状态", formatAssetStatus(asset.status));
  printField("当前所有者", asset.owner);
  printField("权利类型", formatRightsType(asset.rightsType));

  if (fileHashResult === "通过" && metadataHashResult !== "失败") {
    printStatus("SUCCESS", "结构化资产校验完成，当前输入与链上确权记录一致。");
  } else {
    printStatus("ERROR", "结构化资产校验失败，至少有一项指纹与链上记录不一致。");
    process.exitCode = 1;
  }

  if (fileHashResult === "失败") {
    printHint("文件内容哈希不一致，说明文件可能已被修改、替换，或传入了错误的文件路径。");
  }

  if (metadataHashResult === "失败") {
    printHint("metadataHash 不一致，说明元数据 JSON 已被修改，或传入了错误的 metadata 文件。");
  }

  if (asset.status === 1n) {
    printHint("该资产当前已处于 Revoked 状态。撤销不会删除历史确权记录，但不能继续转移。");
  }
}

export async function verifyFileCommand(
  assetIdInput: string,
  filePath: string,
  networkName = getCurrentNetworkName(),
): Promise<void> {
  await verifyAssetCommand({
    assetIdInput,
    filePath,
    networkName,
  });
}

export async function transferAssetCommand(
  assetIdInput: string,
  newOwner: string,
  networkName = getCurrentNetworkName(),
): Promise<void> {
  const assetId = parseAssetId(assetIdInput);
  const targetOwner = newOwner.trim();
  if (targetOwner === "") {
    throw new Error("缺少 --to 参数，请输入新的所有者地址。");
  }

  const { assetRegistry, deployment, ethers } = await connectToAssetRegistry(networkName);
  if (!ethers.isAddress(targetOwner)) {
    throw new Error(`目标地址格式错误: ${targetOwner}`);
  }

  const assetBefore = await ensureAssetExists(assetRegistry, assetId);

  printBanner("数字资产确权系统原型 - 资产权属转移");
  printSection("转移参数");
  printField("网络", networkName);
  printField("合约地址", deployment.contractAddress);
  printField("资产 ID", assetId.toString());
  printField("转移前 owner", assetBefore.owner);
  printField("目标 owner", targetOwner);

  let tx;
  try {
    tx = await assetRegistry.transferAsset(assetId, targetOwner);
  } catch (error) {
    throw new Error(
      `调用 transferAsset 失败: ${translateContractError(formatErrorMessage(error))}`,
    );
  }

  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("交易已发送，但未拿到回执。");
  }

  const transferEvent = parseEvent(receipt, assetRegistry.interface, "AssetTransferred");
  const assetAfter = await ensureAssetExists(assetRegistry, assetId);

  printSection("转移结果");
  printStatus("SUCCESS", "资产权属转移成功。");
  printField("交易哈希", receipt.hash);
  printField("资产 ID", (transferEvent.args.assetId as bigint).toString());
  printField("转移前 owner", transferEvent.args.previousOwner as string);
  printField("转移后 owner", transferEvent.args.newOwner as string);
  printField("当前状态", formatAssetStatus(assetAfter.status));
}

export async function revokeAssetCommand(
  assetIdInput: string,
  networkName = getCurrentNetworkName(),
): Promise<void> {
  const assetId = parseAssetId(assetIdInput);
  const { assetRegistry, deployment } = await connectToAssetRegistry(networkName);
  const assetBefore = await ensureAssetExists(assetRegistry, assetId);

  printBanner("数字资产确权系统原型 - 资产撤销");
  printSection("撤销参数");
  printField("网络", networkName);
  printField("合约地址", deployment.contractAddress);
  printField("资产 ID", assetId.toString());
  printField("当前所有者", assetBefore.owner);
  printField("当前状态", formatAssetStatus(assetBefore.status));

  let tx;
  try {
    tx = await assetRegistry.revokeAsset(assetId);
  } catch (error) {
    throw new Error(
      `调用 revokeAsset 失败: ${translateContractError(formatErrorMessage(error))}`,
    );
  }

  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("交易已发送，但未拿到回执。");
  }

  parseEvent(receipt, assetRegistry.interface, "AssetRevoked");
  const assetAfter = await ensureAssetExists(assetRegistry, assetId);

  printSection("撤销结果");
  printStatus("SUCCESS", "资产已标记为 Revoked。");
  printField("交易哈希", receipt.hash);
  printField("资产 ID", assetId.toString());
  printField("撤销后状态", formatAssetStatus(assetAfter.status));
  printHint("撤销不会删除历史确权记录，但后续 transfer:asset 将被合约拒绝。");
}

export async function historyAssetCommand(
  assetIdInput: string,
  networkName = getCurrentNetworkName(),
): Promise<void> {
  const assetId = parseAssetId(assetIdInput);
  const { assetRegistry, deployment } = await connectToAssetRegistry(networkName);
  const asset = await ensureAssetExists(assetRegistry, assetId);

  const [registeredEvents, transferredEvents, revokedEvents] = await Promise.all([
    assetRegistry.queryFilter(assetRegistry.filters.AssetRegistered(assetId), 0, "latest"),
    assetRegistry.queryFilter(assetRegistry.filters.AssetTransferred(assetId), 0, "latest"),
    assetRegistry.queryFilter(assetRegistry.filters.AssetRevoked(assetId), 0, "latest"),
  ]);

  const historyRecords: AssetHistoryRecord[] = [];

  for (const event of registeredEvents) {
    const parsedEvent = event as any;
    const block = await parsedEvent.getBlock();
    historyRecords.push({
      blockNumber: parsedEvent.blockNumber,
      transactionHash: parsedEvent.transactionHash,
      timestamp: BigInt(block.timestamp),
      action: "REGISTERED",
      summary: [
        `登记创建者=${parsedEvent.args.creator as string}`,
        `当前所有者=${parsedEvent.args.owner as string}`,
        `权利类型=${formatRightsType(parsedEvent.args.rightsType as string)}`,
      ].join("；"),
    });
  }

  for (const event of transferredEvents) {
    const parsedEvent = event as any;
    const block = await parsedEvent.getBlock();
    historyRecords.push({
      blockNumber: parsedEvent.blockNumber,
      transactionHash: parsedEvent.transactionHash,
      timestamp: BigInt(block.timestamp),
      action: "TRANSFERRED",
      summary: [
        `转移前=${parsedEvent.args.previousOwner as string}`,
        `转移后=${parsedEvent.args.newOwner as string}`,
      ].join("；"),
    });
  }

  for (const event of revokedEvents) {
    const parsedEvent = event as any;
    const block = await parsedEvent.getBlock();
    historyRecords.push({
      blockNumber: parsedEvent.blockNumber,
      transactionHash: parsedEvent.transactionHash,
      timestamp: BigInt(block.timestamp),
      action: "REVOKED",
      summary: `撤销操作人=${parsedEvent.args.operator as string}`,
    });
  }

  historyRecords.sort((left, right) => {
    if (left.blockNumber !== right.blockNumber) {
      return left.blockNumber - right.blockNumber;
    }

    return left.transactionHash.localeCompare(right.transactionHash);
  });

  printBanner("数字资产确权系统原型 - 资产历史追溯");
  printSection("当前资产快照");
  printField("网络", networkName);
  printField("合约地址", deployment.contractAddress);
  printStructuredAssetRecord(asset);

  printSection("历史事件");
  if (historyRecords.length === 0) {
    printStatus("WARN", "未查询到该资产的历史事件。");
    return;
  }

  historyRecords.forEach((record, index) => {
    printField(`事件 ${index + 1}`, `${record.action} @ Block ${record.blockNumber}`);
    printField("时间", `${record.timestamp.toString()} (${formatTimestamp(record.timestamp)})`);
    printField("说明", record.summary);
    printField("交易哈希", record.transactionHash);
    if (index < historyRecords.length - 1) {
      console.log("");
    }
  });

  printHint("资产历史由链上事件回放得到，可用于展示登记、转移与撤销的全过程。");
}

export function printCommandError(title: string, prefix: string, error: unknown): void {
  printBanner(title);
  printStatus("ERROR", `${prefix}: ${formatErrorMessage(error)}`);
}

function translateContractError(message: string): string {
  if (message.includes("fileHash already registered")) {
    return "该文件内容已登记。";
  }

  if (message.includes("asset does not exist")) {
    return "资产不存在。";
  }

  if (message.includes("only owner can transfer")) {
    return "仅当前所有者可转移资产。";
  }

  if (message.includes("new owner is zero address")) {
    return "转移目标不能是零地址。";
  }

  if (message.includes("revoked asset cannot transfer")) {
    return "资产已撤销，不能继续转移。";
  }

  if (message.includes("only creator or owner can revoke")) {
    return "仅创建者或当前所有者可撤销资产。";
  }

  if (message.includes("asset already revoked")) {
    return "资产已撤销。";
  }

  if (message.includes("invalid rightsType")) {
    return "权利类型不在允许范围内。";
  }

  return message;
}
