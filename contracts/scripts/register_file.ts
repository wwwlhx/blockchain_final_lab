import { printCommandError, registerFileCommand } from "../utils/assetCommands.js";
import { parseNamedArgs } from "../utils/args.js";

async function main() {
  const args = parseNamedArgs(process.argv.slice(2));
  const filePath = args.file;

  if (!filePath) {
    throw new Error(
      "缺少 --file 参数。\n用法: npm run register:file -- --file ..\\demo_files\\sample_asset.txt --name \"示例数字资产\" --desc \"课程项目演示文件\" --rights original --category document",
    );
  }

  await registerFileCommand({
    file: filePath,
    assetName: args.name,
    description: args.desc,
    rightsType: args.rights,
    assetCategory: args.category,
    networkName: args.network,
  });
}

main().catch((error) => {
  printCommandError("数字资产确权系统原型 - 结构化资产登记", "登记失败", error);
  process.exitCode = 1;
});
