import { printCommandError, verifyAssetCommand } from "../utils/assetCommands.js";
import { parseNamedArgs } from "../utils/args.js";

async function main() {
  const args = parseNamedArgs(process.argv.slice(2));
  const assetId = args["asset-id"] ?? args.assetId;
  const filePath = args.file;
  const metadataPath = args.metadata;

  if (!assetId || !filePath) {
    throw new Error(
      "缺少参数。\n用法: npm run verify:asset -- --asset-id 1 --file ..\\demo_files\\sample_asset.txt --metadata .\\metadata\\asset-1.json",
    );
  }

  await verifyAssetCommand({
    assetIdInput: assetId,
    filePath,
    metadataPath,
    networkName: args.network,
  });
}

main().catch((error) => {
  printCommandError("数字资产确权系统原型 - 结构化资产校验", "校验失败", error);
  process.exitCode = 1;
});
