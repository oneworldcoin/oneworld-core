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

async function getWallet() {
  let pk = process.env.PRIVATE_KEY || '';
  pk = pk.trim();
  if (!pk.startsWith('0x') && pk.length > 0) pk = '0x' + pk;
  if (!pk || pk.length === 0) {
    throw new Error('PRIVATE_KEY not set in environment');
  }
  return new ethers.Wallet(pk);
}

async function main() {
  const rpc = process.env.MAINNET_RPC || process.env.BSC_RPC || 'https://bsc-dataseed.binance.org/';
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = (await getWallet()).connect(provider);
  const deployer = await wallet.getAddress();
  console.log('Force deploy using address:', deployer);

  const contracts = await compileContracts();
  const decimals = 18;
  const cap = ethers.parseUnits('42000000', decimals);

  // Deploy OneW
  const OneW = contracts['OneW'];
  const OneWFactory = new ethers.ContractFactory(OneW.abi, OneW.evm.bytecode.object, wallet);
  console.log('Broadcasting OneW deploy tx...');
  const onew = await OneWFactory.deploy(cap);
  await onew.waitForDeployment();
  const onewAddress = typeof onew.getAddress === 'function' ? await onew.getAddress() : onew.address;
  console.log('✅ OneW deployed at:', onewAddress);

  // Deploy RewardsVault
  const RewardsVault = contracts['RewardsVault'];
  const VaultFactory = new ethers.ContractFactory(RewardsVault.abi, RewardsVault.evm.bytecode.object, wallet);
  const beneficiary = deployer;
  const allocated = ethers.parseUnits('21000000', decimals);
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 60;
  const duration = 365 * 24 * 60 * 60;
  console.log('Broadcasting RewardsVault deploy tx...');
  const vault = await VaultFactory.deploy(onewAddress, beneficiary, allocated, startTime, duration);
  await vault.waitForDeployment();
  const vaultAddress = typeof vault.getAddress === 'function' ? await vault.getAddress() : vault.address;
  console.log('✅ RewardsVault deployed at:', vaultAddress);

  // Mint
  try {
    const mintCirculating = ethers.parseUnits('21000000', decimals);
    console.log('Broadcasting mint to deployer...');
    const tx1 = await onew.mint(deployer, mintCirculating);
    const r1 = await tx1.wait();
    console.log('Mint to deployer tx:', r1.transactionHash);

    console.log('Broadcasting mint to vault...');
    const tx2 = await onew.mint(vaultAddress, mintCirculating);
    const r2 = await tx2.wait();
    console.log('Mint to vault tx:', r2.transactionHash);
  } catch (err) {
    console.error('Mint calls failed:', err && err.message ? err.message : err);
  }

  console.log('Force deploy finished.');
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
