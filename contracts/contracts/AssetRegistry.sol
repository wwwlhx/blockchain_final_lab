// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AssetRegistry {
    enum AssetStatus {
        Active,
        Revoked
    }

    struct Asset {
        uint256 id;
        string fileHash;
        string metadataHash;
        string metadataURI;
        string rightsType;
        address creator;
        address owner;
        uint256 registeredAt;
        AssetStatus status;
    }

    uint256 private nextId = 1;

    mapping(uint256 => Asset) private assets;
    mapping(string => uint256) private assetIdByFileHash;

    event AssetRegistered(
        uint256 indexed assetId,
        string fileHash,
        string metadataHash,
        string metadataURI,
        string rightsType,
        address indexed creator,
        address indexed owner,
        uint256 registeredAt,
        AssetStatus status
    );

    event AssetTransferred(
        uint256 indexed assetId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 transferredAt
    );

    event AssetRevoked(
        uint256 indexed assetId,
        address indexed operator,
        uint256 revokedAt
    );

    function registerAsset(
        string memory fileHash,
        string memory metadataHash,
        string memory metadataURI,
        string memory rightsType
    ) public {
        require(bytes(fileHash).length > 0, "fileHash is required");
        require(bytes(metadataHash).length > 0, "metadataHash is required");
        require(bytes(rightsType).length > 0, "rightsType is required");
        require(_isValidRightsType(rightsType), "invalid rightsType");
        require(assetIdByFileHash[fileHash] == 0, "fileHash already registered");

        uint256 assetId = nextId;
        assets[assetId] = Asset({
            id: assetId,
            fileHash: fileHash,
            metadataHash: metadataHash,
            metadataURI: metadataURI,
            rightsType: rightsType,
            creator: msg.sender,
            owner: msg.sender,
            registeredAt: block.timestamp,
            status: AssetStatus.Active
        });
        assetIdByFileHash[fileHash] = assetId;

        emit AssetRegistered(
            assetId,
            fileHash,
            metadataHash,
            metadataURI,
            rightsType,
            msg.sender,
            msg.sender,
            block.timestamp,
            AssetStatus.Active
        );

        nextId++;
    }

    function getAsset(uint256 assetId) public view returns (Asset memory) {
        Asset memory asset = assets[assetId];
        require(asset.id != 0, "asset does not exist");
        return asset;
    }

    function getAssetIdByFileHash(
        string memory fileHash
    ) public view returns (uint256) {
        return assetIdByFileHash[fileHash];
    }

    function transferAsset(uint256 assetId, address newOwner) public {
        Asset storage asset = assets[assetId];
        require(asset.id != 0, "asset does not exist");
        require(asset.status == AssetStatus.Active, "revoked asset cannot transfer");
        require(msg.sender == asset.owner, "only owner can transfer");
        require(newOwner != address(0), "new owner is zero address");

        address previousOwner = asset.owner;
        asset.owner = newOwner;

        emit AssetTransferred(
            assetId,
            previousOwner,
            newOwner,
            block.timestamp
        );
    }

    function revokeAsset(uint256 assetId) public {
        Asset storage asset = assets[assetId];
        require(asset.id != 0, "asset does not exist");
        require(asset.status == AssetStatus.Active, "asset already revoked");
        require(
            msg.sender == asset.creator || msg.sender == asset.owner,
            "only creator or owner can revoke"
        );

        asset.status = AssetStatus.Revoked;
        emit AssetRevoked(assetId, msg.sender, block.timestamp);
    }

    function _isValidRightsType(
        string memory rightsType
    ) internal pure returns (bool) {
        bytes32 rightsTypeHash = keccak256(bytes(rightsType));
        return
            rightsTypeHash == keccak256(bytes("original")) ||
            rightsTypeHash == keccak256(bytes("licensed")) ||
            rightsTypeHash == keccak256(bytes("assigned")) ||
            rightsTypeHash == keccak256(bytes("joint"));
    }
}
