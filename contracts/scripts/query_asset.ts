import { printCommandError, queryAssetCommand } from "../utils/assetCommands.js";
import { parseNamedArgs } from "../utils/args.js";

async function main() {
  const args = parseNamedArgs(process.argv.slice(2));
  const assetId = args["asset-id"] ?? args.assetId;

  if (!assetId) {
    throw new Error(
      "缺少 --asset-id 参数。\n用法: npm run query:asset -- --asset-id 1",
    );
  }

  await queryAssetCommand(assetId, args.network);
}

main().catch((error) => {
  printCommandError("数字资产确权系统原型 - 结构化资产查询", "查询失败", error);
  process.exitCode = 1;
});
