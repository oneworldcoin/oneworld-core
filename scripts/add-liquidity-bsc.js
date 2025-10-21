const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);

  // Parameters: set these env variables or edit below
  const tokenAddress = process.env.TOKEN_ADDRESS; // deployed OneW address
  const amountTokenDesired = process.env.AMOUNT_TOKEN || ethers.parseUnits('1000', 18); // tokens to add
  const amountETHDesired = process.env.AMOUNT_BNB || ethers.parseUnits('0.1', 18); // BNB to pair (on BSC it's WBNB but router accepts native)
  if (!tokenAddress) {
    console.error('Set TOKEN_ADDRESS env var to the deployed token address');
    process.exit(1);
  }

  // PancakeSwap Router v2 address (BSC mainnet)
  const PANCAKE_ROUTER = process.env.PANCAKE_ROUTER || '0x10ED43C718714eb63d5aA57B78B54704E256024E';

  const abis = require('./abis');
  const router = await ethers.getContractAt(abis.IUniswapV2Router02, PANCAKE_ROUTER, deployer);
  const token = await ethers.getContractAt(abis.IERC20, tokenAddress, deployer);

  // Approve tokens
  await (await token.approve(PANCAKE_ROUTER, amountTokenDesired)).wait();
  console.log('Approved router to spend tokens');

  // addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline)
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
  const tx = await router.addLiquidityETH(tokenAddress, amountTokenDesired, 0, 0, deployer.address, deadline, { value: amountETHDesired });
  const receipt = await tx.wait();
  console.log('Liquidity added, tx:', receipt.transactionHash);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
