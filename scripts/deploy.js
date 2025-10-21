const hre = require("hardhat");

async function main() {
  const { ethers, network, run } = hre;
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address, "on network", network.name);

  // Safety guard: require explicit confirmation to run on mainnet
  if (network.name === "mainnet") {
    if (process.env.CONFIRM_DEPLOY !== "true") {
      console.error("Refusing to deploy to mainnet: set CONFIRM_DEPLOY=true in your environment to confirm.");
      process.exit(1);
    }
  }

  const decimals = 18;
  const cap = ethers.parseUnits("42000000", decimals);

  const OneW = await ethers.getContractFactory("OneW");
  const onew = await OneW.deploy(cap);
  await onew.waitForDeployment();
  const onewAddress = typeof onew.getAddress === 'function' ? await onew.getAddress() : onew.address;
  console.log("✅ OneW deployed at:", onewAddress);

  const RewardsVault = await ethers.getContractFactory("RewardsVault");
  const beneficiary = deployer.address;
  const allocated = ethers.parseUnits("21000000", decimals);
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 60;
  const duration = 365 * 24 * 60 * 60;

  const vault = await RewardsVault.deploy(onewAddress, beneficiary, allocated, startTime, duration);
  await vault.waitForDeployment();
  const vaultAddress = typeof vault.getAddress === 'function' ? await vault.getAddress() : vault.address;
  console.log("✅ RewardsVault deployed at:", vaultAddress);

  const mintCirculating = ethers.parseUnits("21000000", decimals);
  const mintRewards = ethers.parseUnits("21000000", decimals);

  try {
    await (await onew.mint(deployer.address, mintCirculating)).wait();
    console.log("💸 Minted 21M to deployer");

    await (await onew.mint(vaultAddress, mintRewards)).wait();
    console.log("💸 Minted 21M to vault");
  } catch (err) {
    console.warn("Minting failed or mint function restricted:", err && err.message ? err.message : err);
  }

  // Try Etherscan verification if API key is provided and the network supports it
  if (process.env.ETHERSCAN_API_KEY && network.name && network.name !== "hardhat" && network.name !== "localhost") {
    try {
      console.log("Attempting contract verification on Etherscan...");
      await run("verify:verify", {
        address: onewAddress,
        constructorArguments: [cap.toString()],
      });
      await run("verify:verify", {
        address: vaultAddress,
        constructorArguments: [onewAddress, beneficiary, allocated.toString(), startTime, duration],
      });
      console.log("✅ Verification attempted (check Etherscan for status)");
    } catch (verifyErr) {
      console.warn("Verification failed or not supported for this network:", verifyErr && verifyErr.message ? verifyErr.message : verifyErr);
    }
  } else {
    console.log("Skipping verification: ETHERSCAN_API_KEY not set or network does not support it.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
