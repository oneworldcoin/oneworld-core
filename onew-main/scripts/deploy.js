const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const decimals = 18;
  const cap = ethers.utils.parseUnits("42000000", decimals); // 42M total supply

  const OneW = await ethers.getContractFactory("OneW");
  const onew = await OneW.deploy(cap);
  await onew.deployed();
  console.log("✅ OneW deployed at:", onew.address);

  const RewardsVault = await ethers.getContractFactory("RewardsVault");
  const allocated = ethers.utils.parseUnits("21000000", decimals);
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 60; // start in 1 minute
  const duration = 365 * 24 * 60 * 60; // 1 year

  const vault = await RewardsVault.deploy(onew.address, deployer.address, allocated, startTime, duration);
  await vault.deployed();
  console.log("✅ RewardsVault deployed at:", vault.address);

  const mintCirculating = ethers.utils.parseUnits("21000000", decimals);
  const mintRewards = ethers.utils.parseUnits("21000000", decimals);

  await (await onew.mint(deployer.address, mintCirculating)).wait();
  console.log("💰 Minted 21M ONEW to deployer");

  await (await onew.mint(vault.address, mintRewards)).wait();
  console.log("🎁 Minted 21M ONEW to RewardsVault");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
