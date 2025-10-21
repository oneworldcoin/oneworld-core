require('dotenv').config();
const { ethers } = require('ethers');

async function main() {
  const RPC = process.env.BSC_RPC || 'https://bsc-dataseed.binance.org/';
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const MULTISIG = process.env.MULTISIG_ADDRESS;
  const ONEW_ADDR = process.env.ONEW_ADDRESS;
  const VAULT_ADDR = process.env.REWARDS_VAULT_ADDRESS;

  if (!PRIVATE_KEY) throw new Error('Set PRIVATE_KEY in .env (local only)');
  if (!MULTISIG) throw new Error('Set MULTISIG_ADDRESS in .env');
  if (!ONEW_ADDR && !VAULT_ADDR) throw new Error('Set ONEW_ADDRESS or REWARDS_VAULT_ADDRESS in .env');

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log('Using deployer:', await wallet.getAddress());
  console.log('Multisig destination:', MULTISIG);

  const transferIfPossible = async (addr, name) => {
    if (!addr) return;
    console.log(`\nProcessing ${name} at ${addr} ...`);
    // minimal ABI for Ownable.transferOwnership
    const abi = [
      'function owner() view returns (address)',
      'function transferOwnership(address)'
    ];
    const c = new ethers.Contract(addr, abi, wallet);
    try {
      const current = await c.owner();
      console.log(' Current owner:', current);
    } catch (err) {
      console.warn(' Cannot read owner() — contract might not be Ownable or owner() view has different signature. Proceeding to call transferOwnership may fail.');
    }

    try {
      const tx = await c.transferOwnership(MULTISIG);
      console.log(' tx sent:', tx.hash);
      await tx.wait();
      console.log(' Ownership transfer for', name, 'completed.');
    } catch (err) {
      console.error(' Failed to transfer ownership for', name, ':', err.message || err);
    }
  };

  await transferIfPossible(ONEW_ADDR, 'OneW');
  await transferIfPossible(VAULT_ADDR, 'RewardsVault');

  console.log('\nDone. Verify owners on-chain (BscScan) and ensure multisig controls are ready.');
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
