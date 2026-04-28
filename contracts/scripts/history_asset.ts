import { historyAssetCommand, printCommandError } from "../utils/assetCommands.js";
import { parseNamedArgs } from "../utils/args.js";

async function main() {
  const args = parseNamedArgs(process.argv.slice(2));
  const assetId = args["asset-id"] ?? args.assetId;

  if (!assetId) {
    throw new Error(
      "缺少 --asset-id 参数。\n用法: npm run history:asset -- --asset-id 1",
    );
  }

  await historyAssetCommand(assetId, args.network);
}

main().catch((error) => {
  printCommandError("数字资产确权系统原型 - 资产历史追溯", "历史查询失败", error);
  process.exitCode = 1;
});
