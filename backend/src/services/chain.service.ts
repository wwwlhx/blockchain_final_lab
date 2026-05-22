import { getContract, loadDeploymentConfig } from "./blockchain.service.js";

export async function getHealthStatus() {
  const { provider, signers } = await getContract();
  const cfg = await loadDeploymentConfig();
  const address = await signers[0].getAddress();
  const balance = await provider.getBalance(address);

  return {
    connected: true,
    network: cfg.network,
    contractAddress: cfg.contractAddress,
    defaultAccount: address,
    balance: `${(Number(balance) / 1e18).toFixed(2)} ETH`,
  };
}

export async function getDeploymentInfo() {
  return loadDeploymentConfig();
}

export async function getAccounts() {
  const { signers } = await getContract();

  return Promise.all(
    signers.slice(0, 5).map(async (signer, index) => ({
      index,
      address: await signer.getAddress(),
      label: index === 0 ? "默认账户" : `账户 ${index + 1}`,
    }))
  );
}
