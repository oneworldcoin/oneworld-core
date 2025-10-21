const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');
require('dotenv').config();

async function compileContracts() {
  const contractsDir = path.resolve(__dirname, '..', 'contracts');
  const sources = {};
  for (const file of fs.readdirSync(contractsDir)) {
    if (file.endsWith('.sol')) {
      sources[file] = { content: fs.readFileSync(path.join(contractsDir, file), 'utf8') };
    }
  }

  const input = {
    language: 'Solidity',
    sources: Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, v])),
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object']
        }
      }
    }
  };

  function findImports(importPath) {
    const nmPath = path.resolve(__dirname, '..', 'node_modules', ...importPath.split('/'));
    if (fs.existsSync(nmPath)) return { contents: fs.readFileSync(nmPath, 'utf8') };
    const relPath = path.resolve(contractsDir, importPath);
    if (fs.existsSync(relPath)) return { contents: fs.readFileSync(relPath, 'utf8') };
    return { error: 'File not found: ' + importPath };
  }

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    const warnings = output.errors.filter(e => e.severity !== 'error');
    for (const w of warnings) console.warn(w.formattedMessage || w.message);
    if (errors.length) {
      for (const e of errors) console.error(e.formattedMessage || e.message);
      throw new Error('Compilation failed');
    }
  }

  const contracts = {};
  for (const file in output.contracts) {
    for (const name in output.contracts[file]) {
      contracts[name] = output.contracts[file][name];
    }
  }
  return contracts;
}

async function getWalletFromEnvOrMnemonic() {
  if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== '') {
    let pk = process.env.PRIVATE_KEY.trim();
    if (!pk.startsWith('0x')) pk = '0x' + pk;
    return new ethers.Wallet(pk);
  }
  const mnemonic = process.env.TEST_MNEMONIC || 'test test test test test test test test test test test junk';
  if (typeof ethers.Wallet.fromMnemonic === 'function') return ethers.Wallet.fromMnemonic(mnemonic);
  if (typeof ethers.Wallet.fromPhrase === 'function') return ethers.Wallet.fromPhrase(mnemonic);
  if (ethers.HDNodeWallet && typeof ethers.HDNodeWallet.fromMnemonic === 'function') return ethers.HDNodeWallet.fromMnemonic(mnemonic);
  throw new Error('Cannot derive wallet from mnemonic with installed ethers version');
}

async function main() {
  const rpc = process.env.MAINNET_RPC || process.env.BSC_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545/';
  const provider = new ethers.JsonRpcProvider(rpc);

  const wallet = (await getWalletFromEnvOrMnemonic()).connect(provider);
  const deployer = await wallet.getAddress();
  console.log('Using deployer address:', deployer);

  const balance = await provider.getBalance(deployer);
  console.log('Balance (BNB):', ethers.formatEther(balance));

  const contracts = await compileContracts();

  const decimals = 18;
  const cap = ethers.parseUnits('42000000', decimals);

  const OneW = contracts['OneW'];
  const OneWFactory = new ethers.ContractFactory(OneW.abi, OneW.evm.bytecode.object, wallet);
  const onewDeployTx = OneWFactory.getDeployTransaction(cap);

  // estimate gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('5', 'gwei');
  console.log('Gas price (gwei):', ethers.formatUnits(gasPrice, 'gwei'));

  let estDeployGas;
  try {
    estDeployGas = await provider.estimateGas({ from: deployer, data: onewDeployTx.data });
  } catch (err) {
    console.warn('estimateGas deploy failed:', err.message || err);
    estDeployGas = ethers.BigNumber.from('600000');
  }
  const deployCost = estDeployGas * BigInt(gasPrice);
  console.log('Estimated OneW deploy gas:', estDeployGas.toString(), 'Approx cost (BNB):', ethers.formatEther(deployCost));

  const minBalanceNeeded = deployCost + ethers.parseUnits('0.01', 'ether'); // buffer for second deploy/mints
  console.log('Minimum balance recommended to perform live deploy (BNB):', ethers.formatEther(minBalanceNeeded));
  if (BigInt(balance) < BigInt(minBalanceNeeded)) {
    console.error('Insufficient funds to perform live deploy. Current balance is lower than recommended. Aborting live deploy.');
    return;
  }

  if (process.env.CONFIRM_DEPLOY !== 'true') {
    console.log('CONFIRM_DEPLOY is not set to true — stopping after estimate (no broadcast).');
    return;
  }

  console.log('CONFIRM_DEPLOY=true detected and balance seems sufficient — proceeding with live deploy (this will broadcast transactions)');

  // Deploy OneW
  const onew = await OneWFactory.deploy(cap);
  await onew.waitForDeployment();
  const onewAddress = typeof onew.getAddress === 'function' ? await onew.getAddress() : onew.address;
  console.log('OneW deployed at:', onewAddress);

  // Deploy RewardsVault
  const RewardsVault = contracts['RewardsVault'];
  const VaultFactory = new ethers.ContractFactory(RewardsVault.abi, RewardsVault.evm.bytecode.object, wallet);
  const beneficiary = deployer;
  const allocated = ethers.parseUnits('21000000', decimals);
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 60;
  const duration = 365 * 24 * 60 * 60;
  const vault = await VaultFactory.deploy(onewAddress, beneficiary, allocated, startTime, duration);
  await vault.waitForDeployment();
  const vaultAddress = typeof vault.getAddress === 'function' ? await vault.getAddress() : vault.address;
  console.log('RewardsVault deployed at:', vaultAddress);

  // Mint
  try {
    const mintCirculating = ethers.parseUnits('21000000', decimals);
    const tx1 = await onew.mint(deployer, mintCirculating);
    const r1 = await tx1.wait();
    console.log('Mint to deployer tx:', r1.transactionHash);

    const tx2 = await onew.mint(vaultAddress, mintCirculating);
    const r2 = await tx2.wait();
    console.log('Mint to vault tx:', r2.transactionHash);
  } catch (err) {
    console.warn('Mint calls failed:', err.message || err);
  }

  console.log('Live deploy finished.');
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
