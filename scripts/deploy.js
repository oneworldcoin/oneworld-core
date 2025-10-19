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
