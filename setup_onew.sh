#!/bin/bash

echo "🚀 Starting OneWorld Core setup..."

# إنشاء المجلدات
mkdir -p contracts scripts
npm init -y >/dev/null

# تثبيت المكتبات المطلوبة
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv @openzeppelin/contracts

# إنشاء ملف Hardhat
cat > hardhat.config.js << 'CONFIG'
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    bsc: {
      url: process.env.BSC_RPC || "https://bsc-dataseed.binance.org/",
      accounts: [process.env.PRIVATE_KEY],
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
CONFIG

# إنشاء العقود
cat > contracts/OneW.sol << 'SOL'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OneW is ERC20Capped, Ownable {
    constructor(uint256 cap) ERC20("One World", "ONEW") ERC20Capped(cap) Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
SOL

cat > contracts/RewardsVault.sol << 'SOL'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardsVault is Ownable {
    IERC20 public token;
    address public beneficiary;
    uint256 public allocated;
    uint256 public startTime;
    uint256 public duration;
    uint256 public released;

    constructor(
        address _token,
        address _beneficiary,
        uint256 _allocated,
        uint256 _startTime,
        uint256 _duration
    ) Ownable(msg.sender) {
        token = IERC20(_token);
        beneficiary = _beneficiary;
        allocated = _allocated;
        startTime = _startTime;
        duration = _duration;
    }

    function release() external {
        require(block.timestamp >= startTime, "Vault: not started");
        uint256 vested = vestedAmount();
        uint256 unreleased = vested - released;
        require(unreleased > 0, "Vault: nothing to release");
        released += unreleased;
        token.transfer(beneficiary, unreleased);
    }

    function vestedAmount() public view returns (uint256) {
        if (block.timestamp < startTime) return 0;
        uint256 elapsed = block.timestamp - startTime;
        if (elapsed >= duration) return allocated;
        return (allocated * elapsed) / duration;
    }
}
SOL

# إنشاء سكربت النشر
cat > scripts/deploy.js << 'JS'
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const decimals = 18;
  const cap = ethers.parseUnits("42000000", decimals);

  const OneW = await ethers.getContractFactory("OneW");
  const onew = await OneW.deploy(cap);
  await onew.waitForDeployment();
  console.log("✅ OneW deployed at:", await onew.getAddress());

  const RewardsVault = await ethers.getContractFactory("RewardsVault");
  const beneficiary = deployer.address;
  const allocated = ethers.parseUnits("21000000", decimals);
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 60;
  const duration = 365 * 24 * 60 * 60;

  const vault = await RewardsVault.deploy(await onew.getAddress(), beneficiary, allocated, startTime, duration);
  await vault.waitForDeployment();
  console.log("✅ RewardsVault deployed at:", await vault.getAddress());

  const mintCirculating = ethers.parseUnits("21000000", decimals);
  const mintRewards = ethers.parseUnits("21000000", decimals);

  await (await onew.mint(deployer.address, mintCirculating)).wait();
  console.log("💸 Minted 21M to deployer");

  await (await onew.mint(await vault.getAddress(), mintRewards)).wait();
  console.log("💸 Minted 21M to vault");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
JS

# إنشاء ملف البيئة
cat > .env << 'ENV'
PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
BSC_RPC=https://bsc-dataseed.binance.org/
ENV

echo "✅ Project structure created successfully!"
echo "Next steps:"
echo "1️⃣ Replace YOUR_PRIVATE_KEY_HERE in .env with your real MetaMask private key."
echo "2️⃣ Run: npx hardhat compile"
echo "3️⃣ To deploy: npx hardhat run scripts/deploy.js --network bsc"
