import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initDatabase } from "../database/db.js";
import { getContract, loadDeploymentConfig, warmUp } from "../services/blockchain.service.js";
import { registerAsset, transferAsset, revokeAsset } from "../services/asset.service.js";
import { verifyAsset } from "../services/verify.service.js";
import { syncFromChain } from "../services/wallet.service.js";
import { reconcileDeployment } from "../database/dao.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../../..");
const seedDir = path.join(projectRoot, "demo_files", "seed");

async function writeSeedFile(name: string, content: string): Promise<string> {
  await fs.mkdir(seedDir, { recursive: true });
  const filePath = path.join(seedDir, name);
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

async function main() {
  initDatabase();
  await warmUp();

  const deployment = await loadDeploymentConfig();
  const deploymentKey = [
    deployment.network,
    deployment.contractAddress.toLowerCase(),
    deployment.deployedAt,
  ].join(":");
  reconcileDeployment(deploymentKey);

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const files = await Promise.all([
    writeSeedFile(
      `research-note-${runId}.txt`,
      [
        "Digital asset demo document",
        `Seed run: ${runId}`,
        "This file is registered as an original document asset.",
      ].join("\n")
    ),
    writeSeedFile(
      `source-snippet-${runId}.ts`,
      [
        "export function verifyEvidenceChain(fileHash: string, metadataHash: string) {",
        "  return Boolean(fileHash && metadataHash)",
        "}",
        `// seed run: ${runId}`,
      ].join("\n")
    ),
    writeSeedFile(
      `dataset-summary-${runId}.csv`,
      ["category,count", "document,12", "image,5", "code,3", `run,${runId}`].join("\n")
    ),
    writeSeedFile(
      `model-card-${runId}.md`,
      [
        "# Demo Model Card",
        "",
        "Purpose: demonstrate digital asset registration for model metadata.",
        `Seed run: ${runId}`,
      ].join("\n")
    ),
  ]);

  const doc = await registerAsset({
    filePath: files[0],
    assetName: "课程论文初稿",
    description: "用于演示原创文档资产的链上确权记录。",
    rightsType: "original",
    assetCategory: "document",
  });
  const code = await registerAsset({
    filePath: files[1],
    assetName: "验真工具源码片段",
    description: "用于演示代码类数字资产登记。",
    rightsType: "original",
    assetCategory: "code",
  });
  const dataset = await registerAsset({
    filePath: files[2],
    assetName: "实验数据摘要",
    description: "用于演示数据集类资产登记和转移。",
    rightsType: "licensed",
    assetCategory: "dataset",
  });
  const model = await registerAsset({
    filePath: files[3],
    assetName: "模型说明卡",
    description: "用于演示可撤销的模型类资产。",
    rightsType: "joint",
    assetCategory: "model",
  });

  const { signers } = await getContract();
  const targetOwner = await signers[1].getAddress();
  await transferAsset(dataset.assetId, targetOwner);
  await revokeAsset(model.assetId);

  const tampered = await writeSeedFile(
    `tampered-${runId}.txt`,
    [
      "This file intentionally differs from the registered document.",
      `Seed run: ${runId}`,
    ].join("\n")
  );
  const sync = await syncFromChain();

  await verifyAsset(doc.assetId, files[0]);
  await verifyAsset(doc.assetId, tampered);

  console.log("Demo seed completed");
  console.log(
    JSON.stringify(
      {
        assets: [doc.assetId, code.assetId, dataset.assetId, model.assetId],
        transferredAsset: dataset.assetId,
        revokedAsset: model.assetId,
        targetOwner,
        sync,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
