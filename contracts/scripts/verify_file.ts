import { printCommandError, verifyFileCommand } from "../utils/assetCommands.js";
import { parseNamedArgs } from "../utils/args.js";

async function main() {
  const args = parseNamedArgs(process.argv.slice(2));
  const assetId = args["asset-id"] ?? args.assetId;
  const filePath = args.file;

  if (!assetId || !filePath) {
    throw new Error(
      "缺少参数。\n用法: npm run verify:file -- --asset-id 1 --file ..\\demo_files\\sample_asset.txt",
    );
  }

  await verifyFileCommand(assetId, filePath, args.network);
}

main().catch((error) => {
  printCommandError("数字资产确权系统原型 - 文件内容校验", "校验失败", error);
  process.exitCode = 1;
});
