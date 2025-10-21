const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');

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

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
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

async function main() {
  console.log('Connecting to local RPC at http://127.0.0.1:8545 ...');
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

  // Use the common Ganache test mnemonic so the private keys are deterministic
  const mnemonic = 'test test test test test test test test test test test junk';
  let wallet;
  try {
    if (typeof ethers.Wallet.fromMnemonic === 'function') {
      wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
    } else if (typeof ethers.Wallet.fromPhrase === 'function') {
      wallet = ethers.Wallet.fromPhrase(mnemonic).connect(provider);
    } else {
      // fallback to a random wallet (non-deterministic) and warn
      console.warn('ethers does not expose fromMnemonic/fromPhrase; using random wallet fallback');
      wallet = ethers.Wallet.createRandom().connect(provider);
    }
  } catch (err) {
    console.warn('Failed to derive wallet from mnemonic, falling back to random wallet:', err.message || err);
    wallet = ethers.Wallet.createRandom().connect(provider);
  }

  // check RPC connectivity
  try {
    await provider.getBlockNumber();
  } catch (err) {
    console.error('Cannot connect to local RPC at http://127.0.0.1:8545. Please start Ganache or Hardhat node locally and retry.');
    throw err;
  }

  const deployerAddress = await wallet.getAddress();
  console.log('Using deployer:', deployerAddress);

  const contracts = await compileContracts();

  // Deploy OneW
  const OneW = contracts['OneW'];
  const OneWFactory = new ethers.ContractFactory(OneW.abi, OneW.evm.bytecode.object, wallet);
  const decimals = 18;
  const cap = ethers.parseUnits('42000000', decimals);
  console.log('Deploying OneW (cap = 42,000,000) ...');
  const onew = await OneWFactory.deploy(cap);
  if (typeof onew.waitForDeployment === 'function') await onew.waitForDeployment();
  const onewAddress = onew.target || onew.address || (typeof onew.getAddress === 'function' ? await onew.getAddress() : undefined);
  console.log('OneW deployed at:', onewAddress);

  // Deploy RewardsVault
  const RewardsVault = contracts['RewardsVault'];
  const VaultFactory = new ethers.ContractFactory(RewardsVault.abi, RewardsVault.evm.bytecode.object, wallet);
  const beneficiary = wallet.address;
  const allocated = ethers.parseUnits('21000000', decimals);
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 60;
  const duration = 365 * 24 * 60 * 60;
  console.log('Deploying RewardsVault ...');
  const vault = await VaultFactory.deploy(onewAddress, beneficiary, allocated, startTime, duration);
  if (typeof vault.waitForDeployment === 'function') await vault.waitForDeployment();
  const vaultAddress = vault.target || vault.address || (typeof vault.getAddress === 'function' ? await vault.getAddress() : undefined);
  console.log('RewardsVault deployed at:', vaultAddress);

  // Mint to deployer and vault (if mint exists) and record txs
  const results = {
    deployer: deployerAddress,
    onew: onewAddress,
    vault: vaultAddress,
    txs: []
  };

  try {
    const mintCirculating = ethers.parseUnits('21000000', decimals);
    console.log('Minting 21M to deployer...');
    const tx1 = await onew.mint(deployerAddress, mintCirculating);
    const r1 = tx1.wait ? await tx1.wait() : null;
    results.txs.push({ action: 'mint_deployer', hash: tx1.hash || (r1 && r1.transactionHash) });
    console.log('Minted to deployer, tx:', tx1.hash || (r1 && r1.transactionHash));

    console.log('Minting 21M to vault...');
    const tx2 = await onew.mint(vaultAddress, mintCirculating);
    const r2 = tx2.wait ? await tx2.wait() : null;
    results.txs.push({ action: 'mint_vault', hash: tx2.hash || (r2 && r2.transactionHash) });
    console.log('Minted to vault, tx:', tx2.hash || (r2 && r2.transactionHash));
  } catch (err) {
    console.warn('Mint calls failed or not available:', err.message || err);
  }

  // write deployments to file
  const deploymentsDir = path.resolve(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });
  const outPath = path.join(deploymentsDir, 'local.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log('Wrote deployment info to', outPath);

  console.log('Local deployment finished.');
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
