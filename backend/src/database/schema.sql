-- 数字资产确权系统 - 链下数据库表结构
-- 设计原则：链上存核心确权数据（不可篡改），链下存索引/展示/日志（快速查询）

-- 资产表：链下索引，与链上 Asset struct 对应
CREATE TABLE IF NOT EXISTS assets (
  id              INTEGER PRIMARY KEY,          -- 链上 assetId
  file_hash       TEXT    NOT NULL,             -- SHA-256 文件指纹
  metadata_hash   TEXT    NOT NULL,             -- 元数据哈希
  metadata_uri    TEXT,                         -- 元数据 JSON 路径
  rights_type     TEXT    NOT NULL,             -- original/licensed/assigned/joint
  asset_category  TEXT,                         -- 资产类别
  creator         TEXT    NOT NULL,             -- 创建者地址
  owner           TEXT    NOT NULL,             -- 当前所有者地址
  status          INTEGER NOT NULL DEFAULT 0,   -- 0=Active, 1=Revoked
  registered_at   INTEGER NOT NULL,             -- 链上时间戳(unix)
  tx_hash         TEXT,                         -- 登记交易哈希
  block_number    INTEGER,                      -- 登记区块号
  created_at      TEXT    DEFAULT (datetime('now', 'localtime'))
);

-- 元数据详情表：存储 metadata JSON 结构化字段
CREATE TABLE IF NOT EXISTS metadata (
  asset_id        INTEGER PRIMARY KEY REFERENCES assets(id),
  asset_name      TEXT    NOT NULL,
  description     TEXT,
  asset_category  TEXT,
  original_filename TEXT,
  file_extension  TEXT,
  file_size       INTEGER,
  hash_algorithm  TEXT    DEFAULT 'SHA-256',
  rights_type     TEXT,
  claimant_address TEXT,
  created_at_local TEXT,
  raw_json        TEXT                          -- 完整 metadata JSON 备份
);

-- 交易记录表：所有链上操作的链下镜像
CREATE TABLE IF NOT EXISTS transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id        INTEGER NOT NULL REFERENCES assets(id),
  type            TEXT    NOT NULL,             -- REGISTERED/TRANSFERRED/REVOKED
  from_address    TEXT,
  to_address      TEXT,
  operator        TEXT,
  tx_hash         TEXT    NOT NULL,
  block_number    INTEGER NOT NULL,
  block_timestamp INTEGER,
  created_at      TEXT    DEFAULT (datetime('now', 'localtime'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);

-- 校验记录表：每次文件校验的日志
CREATE TABLE IF NOT EXISTS verification_records (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id        INTEGER NOT NULL REFERENCES assets(id),
  file_path       TEXT,
  local_file_hash TEXT    NOT NULL,
  chain_file_hash TEXT    NOT NULL,
  file_match      INTEGER NOT NULL,             -- 0=不匹配, 1=匹配
  metadata_match  INTEGER,                      -- NULL/0/1
  overall_result  INTEGER NOT NULL,             -- 0=失败, 1=通过
  verified_at     TEXT    DEFAULT (datetime('now', 'localtime'))
);

-- 系统日志表
CREATE TABLE IF NOT EXISTS system_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  level           TEXT    NOT NULL DEFAULT 'info', -- info/warn/error
  action          TEXT    NOT NULL,
  message         TEXT,
  details         TEXT,                         -- JSON 补充信息
  created_at      TEXT    DEFAULT (datetime('now', 'localtime'))
);

-- 系统状态表：记录当前链和合约部署身份。
-- Hardhat 本地链重新部署后，用它识别并清理上一轮演示留下的链下索引。
CREATE TABLE IF NOT EXISTS system_state (
  key             TEXT PRIMARY KEY,
  value           TEXT NOT NULL,
  updated_at      TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_assets_file_hash ON assets(file_hash);
CREATE INDEX IF NOT EXISTS idx_assets_creator ON assets(creator);
CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_transactions_asset ON transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_verification_asset ON verification_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON system_logs(action);
