import assert from "node:assert/strict";

export async function runContractTests(
  ethers: any,
): Promise<void> {
  async function deployRegistry() {
    return ethers.deployContract("AssetRegistry");
  }

  {
    const registry = await deployRegistry();
    await registry.registerAsset("file-hash-1", "metadata-hash-1", "metadata/1.json", "original");
    const asset = await registry.getAsset(1n);
    assert.equal(asset.id, 1n);
    assert.equal(asset.fileHash, "file-hash-1");
    assert.equal(asset.metadataHash, "metadata-hash-1");
    assert.equal(asset.metadataURI, "metadata/1.json");
    assert.equal(asset.rightsType, "original");
    assert.equal(asset.status, 0n);
    assert.equal(asset.creator, asset.owner);
  }

  {
    const registry = await deployRegistry();
    await assert.rejects(
      registry.registerAsset("", "metadata-hash-1", "", "original"),
      /fileHash is required/,
    );
  }

  {
    const registry = await deployRegistry();
    await assert.rejects(
      registry.registerAsset("file-hash-1", "", "", "original"),
      /metadataHash is required/,
    );
  }

  {
    const registry = await deployRegistry();
    await assert.rejects(
      registry.registerAsset("file-hash-1", "metadata-hash-1", "", ""),
      /rightsType is required/,
    );
  }

  {
    const registry = await deployRegistry();
    await assert.rejects(
      registry.registerAsset("file-hash-invalid", "metadata-hash-invalid", "", "unknown"),
      /invalid rightsType/,
    );
  }

  {
    const registry = await deployRegistry();
    await registry.registerAsset("file-hash-dup", "metadata-hash-1", "", "original");
    await assert.rejects(
      registry.registerAsset("file-hash-dup", "metadata-hash-2", "", "licensed"),
      /fileHash already registered/,
    );
  }

  {
    const registry = await deployRegistry();
    await registry.registerAsset("file-hash-2", "metadata-hash-2", "metadata/2.json", "licensed");
    const asset = await registry.getAsset(1n);
    assert.deepEqual(
      {
        id: asset.id,
        fileHash: asset.fileHash,
        metadataHash: asset.metadataHash,
        metadataURI: asset.metadataURI,
        rightsType: asset.rightsType,
      },
      {
        id: 1n,
        fileHash: "file-hash-2",
        metadataHash: "metadata-hash-2",
        metadataURI: "metadata/2.json",
        rightsType: "licensed",
      },
    );
  }

  {
    const registry = await deployRegistry();
    assert.equal(await registry.getAssetIdByFileHash("not-exists"), 0n);
    await registry.registerAsset("file-hash-3", "metadata-hash-3", "", "original");
    assert.equal(await registry.getAssetIdByFileHash("file-hash-3"), 1n);
  }

  {
    const registry = await deployRegistry();
    const [, receiver] = await ethers.getSigners();
    await registry.registerAsset("file-hash-4", "metadata-hash-4", "", "original");
    await registry.transferAsset(1n, receiver.address);
    const asset = await registry.getAsset(1n);
    assert.equal(asset.owner, receiver.address);
  }

  {
    const registry = await deployRegistry();
    const [, receiver, outsider] = await ethers.getSigners();
    await registry.registerAsset("file-hash-5", "metadata-hash-5", "", "original");
    await assert.rejects(
      registry.connect(outsider).transferAsset(1n, receiver.address),
      /only owner can transfer/,
    );
  }

  {
    const registry = await deployRegistry();
    const [, receiver] = await ethers.getSigners();
    await registry.registerAsset("file-hash-6", "metadata-hash-6", "", "original");
    await registry.transferAsset(1n, receiver.address);
    await registry.revokeAsset(1n);
    const asset = await registry.getAsset(1n);
    assert.equal(asset.status, 1n);
  }

  {
    const registry = await deployRegistry();
    const [, receiver] = await ethers.getSigners();
    await registry.registerAsset("file-hash-7", "metadata-hash-7", "", "original");
    await registry.revokeAsset(1n);
    await assert.rejects(
      registry.transferAsset(1n, receiver.address),
      /revoked asset cannot transfer/,
    );
  }

  {
    const registry = await deployRegistry();
    await assert.rejects(registry.getAsset(999n), /asset does not exist/);
  }

  {
    const registry = await deployRegistry();
    const [, receiver] = await ethers.getSigners();
    await registry.registerAsset("file-hash-history", "metadata-hash-history", "", "original");
    await registry.transferAsset(1n, receiver.address);
    await registry.connect(receiver).revokeAsset(1n);

    const registeredEvents = await registry.queryFilter(
      registry.filters.AssetRegistered(1n),
      0,
      "latest",
    );
    const transferredEvents = await registry.queryFilter(
      registry.filters.AssetTransferred(1n),
      0,
      "latest",
    );
    const revokedEvents = await registry.queryFilter(
      registry.filters.AssetRevoked(1n),
      0,
      "latest",
    );

    assert.equal(registeredEvents.length, 1);
    assert.equal(transferredEvents.length, 1);
    assert.equal(revokedEvents.length, 1);
  }
}
