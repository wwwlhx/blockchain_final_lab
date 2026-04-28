import { network } from "hardhat";

import { formatErrorMessage, printBanner, printSection, printStatus } from "../utils/cli.js";
import { runContractTests } from "../test/AssetRegistry.test.js";
import { runFlowTests } from "../test/flow.test.js";
import { runUtilityTests } from "../test/metadata.test.js";

async function main() {
  const { ethers } = await network.getOrCreate();

  printBanner("数字资产确权系统原型 - 测试套件");

  printSection("合约测试");
  await runContractTests(ethers);
  printStatus("SUCCESS", "合约测试全部通过。");

  printSection("链下工具测试");
  await runUtilityTests();
  printStatus("SUCCESS", "metadata 与 fileHash 工具测试全部通过。");

  printSection("流程测试");
  await runFlowTests(ethers);
  printStatus("SUCCESS", "register -> query -> verify 关键流程测试全部通过。");

  printSection("测试总结");
  printStatus("SUCCESS", "结构化数字资产确权核心原型测试通过。");
}

main().catch((error) => {
  printBanner("数字资产确权系统原型 - 测试套件");
  printStatus("ERROR", `测试失败: ${formatErrorMessage(error)}`);
  process.exitCode = 1;
});
