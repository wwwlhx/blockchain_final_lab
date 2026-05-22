import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT) || 3001,
  uploadDir: path.resolve(__dirname, "../../uploads"),
  contractsDir: path.resolve(__dirname, "../../../contracts"),
  maxFileSize: 50 * 1024 * 1024, // 50MB
  network: process.env.NETWORK || "localhost",
  rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
};
