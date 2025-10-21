require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main() {
  const MULTISIG = process.env.MULTISIG_ADDRESS;
  const ONEW = process.env.ONEW_ADDRESS;
  const VAULT = process.env.REWARDS_VAULT_ADDRESS;

  if (!MULTISIG) {
    console.error('Set MULTISIG_ADDRESS in .env before running.');
    process.exit(1);
  }

  const targets = [];
  const iface = new ethers.Interface(['function transferOwnership(address)']);

  if (ONEW) {
    const data = iface.encodeFunctionData('transferOwnership', [MULTISIG]);
    targets.push({ to: ONEW, value: '0', data, description: 'Transfer OneW ownership to multisig' });
  }
  if (VAULT) {
    const data = iface.encodeFunctionData('transferOwnership', [MULTISIG]);
    targets.push({ to: VAULT, value: '0', data, description: 'Transfer RewardsVault ownership to multisig' });
  }

  if (targets.length === 0) {
    console.error('No contract addresses found. Set ONEW_ADDRESS and/or REWARDS_VAULT_ADDRESS in .env.');
    process.exit(1);
  }

  const outDir = path.resolve(__dirname, '..', 'deployments');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'safe-proposal.json');
  fs.writeFileSync(outFile, JSON.stringify({ multisig: MULTISIG, transactions: targets }, null, 2));
  console.log('Safe proposal written to', outFile);
  console.log('You can use this JSON to propose transactions in your Gnosis Safe UI or via the Safe Transaction Service.');
}

main().catch(err => { console.error(err); process.exit(1); });
