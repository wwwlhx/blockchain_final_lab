import { printCommandError, revokeAssetCommand } from "../utils/assetCommands.js";
import { parseNamedArgs } from "../utils/args.js";

async function main() {
  const args = parseNamedArgs(process.argv.slice(2));
  const assetId = args["asset-id"] ?? args.assetId;

  if (!assetId) {
    throw new Error(
      "缺少参数。\n用法: npm run revoke:asset -- --asset-id 1",
    );
  }

  await revokeAssetCommand(assetId, args.network);
}

main().catch((error) => {
  printCommandError("数字资产确权系统原型 - 资产撤销", "撤销失败", error);
  process.exitCode = 1;
});
