import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../../data/asset_registry.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // 确保 data 目录存在
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  return _db;
}

export function initDatabase(): void {
  const db = getDb();
  const schema = fs.readFileSync(
    path.resolve(__dirname, "schema.sql"),
    "utf-8"
  );
  db.exec(schema);
  console.log("✅ SQLite database initialized");
}
