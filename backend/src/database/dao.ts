import { getDb } from "./db.js";

// ══════════════════════════════════════
// assets 表操作
// ══════════════════════════════════════

export interface AssetRow {
  id: number;
  file_hash: string;
  metadata_hash: string;
  metadata_uri: string | null;
  rights_type: string;
  asset_category: string | null;
  creator: string;
  owner: string;
  status: number;
  registered_at: number;
  tx_hash: string | null;
  block_number: number | null;
  created_at: string;
}

export function insertAsset(data: {
  id: number;
  file_hash: string;
  metadata_hash: string;
  metadata_uri?: string;
  rights_type: string;
  asset_category?: string;
  creator: string;
  owner: string;
  status: number;
  registered_at: number;
  tx_hash?: string;
  block_number?: number;
}) {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO assets 
    (id, file_hash, metadata_hash, metadata_uri, rights_type, asset_category, creator, owner, status, registered_at, tx_hash, block_number)
    VALUES (@id, @file_hash, @metadata_hash, @metadata_uri, @rights_type, @asset_category, @creator, @owner, @status, @registered_at, @tx_hash, @block_number)
  `).run({
    id: data.id,
    file_hash: data.file_hash,
    metadata_hash: data.metadata_hash,
    metadata_uri: data.metadata_uri ?? null,
    rights_type: data.rights_type,
    asset_category: data.asset_category ?? null,
    creator: data.creator,
    owner: data.owner,
    status: data.status,
    registered_at: data.registered_at,
    tx_hash: data.tx_hash ?? null,
    block_number: data.block_number ?? null,
  });
}

export function getAssetRow(id: number): AssetRow | undefined {
  return getDb().prepare("SELECT * FROM assets WHERE id = ?").get(id) as AssetRow | undefined;
}

export function listAssetRows(): AssetRow[] {
  return getDb().prepare("SELECT * FROM assets ORDER BY id DESC").all() as AssetRow[];
}

export function updateAssetOwner(id: number, newOwner: string) {
  getDb().prepare("UPDATE assets SET owner = ? WHERE id = ?").run(newOwner, id);
}

export function updateAssetStatus(id: number, status: number) {
  getDb().prepare("UPDATE assets SET status = ? WHERE id = ?").run(status, id);
}

// ══════════════════════════════════════
// metadata 表操作
// ══════════════════════════════════════

export function insertMetadata(data: {
  asset_id: number;
  asset_name: string;
  description?: string;
  asset_category?: string;
  original_filename?: string;
  file_extension?: string;
  file_size?: number;
  rights_type?: string;
  claimant_address?: string;
  created_at_local?: string;
  raw_json?: string;
}) {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO metadata 
    (asset_id, asset_name, description, asset_category, original_filename, file_extension, file_size, rights_type, claimant_address, created_at_local, raw_json)
    VALUES (@asset_id, @asset_name, @description, @asset_category, @original_filename, @file_extension, @file_size, @rights_type, @claimant_address, @created_at_local, @raw_json)
  `).run({
    asset_id: data.asset_id,
    asset_name: data.asset_name,
    description: data.description ?? null,
    asset_category: data.asset_category ?? null,
    original_filename: data.original_filename ?? null,
    file_extension: data.file_extension ?? null,
    file_size: data.file_size ?? null,
    rights_type: data.rights_type ?? null,
    claimant_address: data.claimant_address ?? null,
    created_at_local: data.created_at_local ?? null,
    raw_json: data.raw_json ?? null,
  });
}

// ══════════════════════════════════════
// transactions 表操作
// ══════════════════════════════════════

export function insertTransaction(data: {
  asset_id: number;
  type: string;
  from_address?: string;
  to_address?: string;
  operator?: string;
  tx_hash: string;
  block_number: number;
  block_timestamp?: number;
}) {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO transactions
    (asset_id, type, from_address, to_address, operator, tx_hash, block_number, block_timestamp)
    VALUES (@asset_id, @type, @from_address, @to_address, @operator, @tx_hash, @block_number, @block_timestamp)
  `).run({
    asset_id: data.asset_id,
    type: data.type,
    from_address: data.from_address ?? null,
    to_address: data.to_address ?? null,
    operator: data.operator ?? null,
    tx_hash: data.tx_hash,
    block_number: data.block_number,
    block_timestamp: data.block_timestamp ?? null,
  });
}

export function getTransactionsByAsset(assetId: number) {
  return getDb()
    .prepare("SELECT * FROM transactions WHERE asset_id = ? ORDER BY block_number ASC")
    .all(assetId);
}

export function getTransactionByHash(txHash: string) {
  return getDb()
    .prepare("SELECT * FROM transactions WHERE tx_hash = ?")
    .get(txHash);
}

// ══════════════════════════════════════
// verification_records 表操作
// ══════════════════════════════════════

export function insertVerification(data: {
  asset_id: number;
  file_path?: string;
  local_file_hash: string;
  chain_file_hash: string;
  file_match: boolean;
  metadata_match?: boolean | null;
  overall_result: boolean;
}) {
  getDb().prepare(`
    INSERT INTO verification_records 
    (asset_id, file_path, local_file_hash, chain_file_hash, file_match, metadata_match, overall_result)
    VALUES (@asset_id, @file_path, @local_file_hash, @chain_file_hash, @file_match, @metadata_match, @overall_result)
  `).run({
    asset_id: data.asset_id,
    file_path: data.file_path ?? null,
    local_file_hash: data.local_file_hash,
    chain_file_hash: data.chain_file_hash,
    file_match: data.file_match ? 1 : 0,
    metadata_match: data.metadata_match == null ? null : data.metadata_match ? 1 : 0,
    overall_result: data.overall_result ? 1 : 0,
  });
}

// ══════════════════════════════════════
// system_logs 表操作
// ══════════════════════════════════════

export function insertLog(level: string, action: string, message?: string, details?: any) {
  getDb().prepare(`
    INSERT INTO system_logs (level, action, message, details)
    VALUES (?, ?, ?, ?)
  `).run(level, action, message ?? null, details ? JSON.stringify(details) : null);
}

// ══════════════════════════════════════
// 本地链部署一致性
// ══════════════════════════════════════

export function reconcileDeployment(deploymentKey: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM system_state WHERE key = 'deployment_key'")
    .get() as { value: string } | undefined;

  if (row?.value === deploymentKey) return false;

  const reconcile = db.transaction(() => {
    // 子表必须先删除，以满足外键约束。
    db.prepare("DELETE FROM verification_records").run();
    db.prepare("DELETE FROM transactions").run();
    db.prepare("DELETE FROM metadata").run();
    db.prepare("DELETE FROM assets").run();
    db.prepare("DELETE FROM system_logs").run();
    db.prepare(`
      INSERT INTO system_state (key, value, updated_at)
      VALUES ('deployment_key', ?, datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).run(deploymentKey);
    db.prepare(`
      INSERT INTO system_logs (level, action, message, details)
      VALUES ('info', 'CHAIN_SYNC', '检测到新的合约部署，已重置链下索引', ?)
    `).run(JSON.stringify({ deploymentKey }));
  });

  reconcile();
  return true;
}

export function clearIndexedData(): void {
  const db = getDb();
  const clear = db.transaction(() => {
    db.prepare("DELETE FROM verification_records").run();
    db.prepare("DELETE FROM transactions").run();
    db.prepare("DELETE FROM metadata").run();
    db.prepare("DELETE FROM assets").run();
    db.prepare("DELETE FROM system_logs").run();
  });
  clear();
}

// ══════════════════════════════════════
// 统计查询
// ══════════════════════════════════════

export function getStats() {
  const db = getDb();
  const totalAssets = (db.prepare("SELECT COUNT(*) as cnt FROM assets").get() as any).cnt;
  const activeAssets = (db.prepare("SELECT COUNT(*) as cnt FROM assets WHERE status = 0").get() as any).cnt;
  const revokedAssets = (db.prepare("SELECT COUNT(*) as cnt FROM assets WHERE status = 1").get() as any).cnt;
  const totalTransactions = (db.prepare("SELECT COUNT(*) as cnt FROM transactions").get() as any).cnt;
  const totalVerifications = (db.prepare("SELECT COUNT(*) as cnt FROM verification_records").get() as any).cnt;
  const passedVerifications = (db.prepare("SELECT COUNT(*) as cnt FROM verification_records WHERE overall_result = 1").get() as any).cnt;
  const recentLogs = db.prepare("SELECT * FROM system_logs ORDER BY id DESC LIMIT 10").all();
  const categoryDistribution = db.prepare(`
    SELECT COALESCE(asset_category, 'other') AS name, COUNT(*) AS value
    FROM assets
    GROUP BY COALESCE(asset_category, 'other')
    ORDER BY value DESC
  `).all();
  const transactionDistribution = db.prepare(`
    SELECT type AS name, COUNT(*) AS value
    FROM transactions
    GROUP BY type
    ORDER BY value DESC
  `).all();
  const dailyRegistrations = db.prepare(`
    SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS value
    FROM assets
    GROUP BY substr(created_at, 1, 10)
    ORDER BY date ASC
    LIMIT 14
  `).all();

  return {
    totalAssets,
    activeAssets,
    revokedAssets,
    totalTransactions,
    totalVerifications,
    passedVerifications,
    recentLogs,
    categoryDistribution,
    transactionDistribution,
    dailyRegistrations,
  };
}
