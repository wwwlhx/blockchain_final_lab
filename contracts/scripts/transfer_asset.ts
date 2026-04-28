import { printCommandError, transferAssetCommand } from "../utils/assetCommands.js";
import { parseNamedArgs } from "../utils/args.js";

async function main() {
  const args = parseNamedArgs(process.argv.slice(2));
  const assetId = args["asset-id"] ?? args.assetId;
  const targetOwner = args.to;

  if (!assetId || !targetOwner) {
    throw new Error(
      "缺少参数。\n用法: npm run transfer:asset -- --asset-id 1 --to 0x1234...",
    );
  }

  await transferAssetCommand(assetId, targetOwner, args.network);
}

main().catch((error) => {
  printCommandError("数字资产确权系统原型 - 资产权属转移", "转移失败", error);
  process.exitCode = 1;
});
