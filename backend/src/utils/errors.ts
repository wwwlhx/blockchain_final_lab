export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 400, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource}不存在`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class BlockchainError extends AppError {
  constructor(message: string) {
    super(message, 502);
  }
}

// 合约 revert 消息 → 中文友好提示
const ERROR_MAP: Record<string, string> = {
  "asset does not exist": "资产不存在",
  "only owner can transfer": "仅当前所有者可转移资产",
  "revoked asset": "已撤销的资产无法操作",
  "already revoked": "资产已被撤销",
  "only creator or owner": "仅创建者或所有者可撤销资产",
  "duplicate file hash": "该文件已被登记",
  "fileHash already registered": "该文件已被登记",
  "invalid rightsType": "无效的权利类型",
  "new owner is zero address": "新所有者地址不能为零地址",
};

export function friendlyError(msg: string): string {
  const lower = msg.toLowerCase();
  for (const [key, val] of Object.entries(ERROR_MAP)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return msg;
}
