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

  // provide import resolver to load dependencies from node_modules
  function findImports(importPath) {
    // try project node_modules
    const nmPath = path.resolve(__dirname, '..', 'node_modules', ...importPath.split('/'));
    if (fs.existsSync(nmPath)) {
      return { contents: fs.readFileSync(nmPath, 'utf8') };
    }
    // try relative to contracts directory
    const relPath = path.resolve(contractsDir, importPath);
    if (fs.existsSync(relPath)) {
      return { contents: fs.readFileSync(relPath, 'utf8') };
    }
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

function toBNB(wei, price) {
  // wei is BigInt or BigNumber-like; price in wei per gas (BigNumber)
  // Return BNB value as string
  return ethers.formatEther(wei * BigInt(price));
}

async function main() {
  const rpc = process.env.MAINNET_RPC || 'https://bsc-dataseed.binance.org/';
  const provider = new ethers.JsonRpcProvider(rpc);

  // test mnemonic (deterministic) - safe for local estimations
  const mnemonic = 'test test test test test test test test test test test junk';
  let wallet;
  if (typeof ethers.Wallet.fromMnemonic === 'function') {
    wallet = ethers.Wallet.fromMnemonic(mnemonic);
  } else if (typeof ethers.Wallet.fromPhrase === 'function') {
    wallet = ethers.Wallet.fromPhrase(mnemonic);
  } else if (ethers.HDNodeWallet && typeof ethers.HDNodeWallet.fromMnemonic === 'function') {
    wallet = ethers.HDNodeWallet.fromMnemonic(mnemonic);
  } else {
    wallet = ethers.Wallet.createRandom();
  }
  const account = wallet.connect(provider);
  console.log('Using account (test):', await account.getAddress());

  const contracts = await compileContracts();

  const decimals = 18;
  const cap = ethers.parseUnits('42000000', decimals);

  // Prepare OneW deploy tx
  const OneW = contracts['OneW'];
  const OneWFactory = new ethers.ContractFactory(OneW.abi, OneW.evm.bytecode.object, account);
  const onewDeployTx = OneWFactory.getDeployTransaction(cap);

  // Estimate gas for deploy
  let gasPrice;
  try {
    const feeData = await provider.getFeeData();
    gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('5', 'gwei');
  } catch (e) {
    gasPrice = ethers.parseUnits('5', 'gwei');
  }

  console.log('Using gasPrice (wei):', gasPrice.toString());

  let estDeployGas;
  try {
    estDeployGas = await provider.estimateGas({
      from: await account.getAddress(),
      data: onewDeployTx.data,
    });
  } catch (err) {
    console.warn('estimateGas for OneW deploy failed:', err.message || err);
    estDeployGas = null;
  }

  console.log('Estimated gas for OneW deploy:', estDeployGas ? estDeployGas.toString() : 'n/a');
  if (estDeployGas) {
    const costWei = estDeployGas * BigInt(gasPrice);
    console.log('Approx cost (BNB):', ethers.formatEther(costWei));
  }

  // Prepare RewardsVault deploy tx (needs token address; we simulate by using a placeholder address derived from deployer + nonce)
  // We can simulate the deployed address via the CREATE formula, but easier: estimate separately by constructing a deploy with dummy token address
  const dummyToken = ethers.ZeroAddress; // use zero address in estimation
  const RewardsVault = contracts['RewardsVault'];
  const VaultFactory = new ethers.ContractFactory(RewardsVault.abi, RewardsVault.evm.bytecode.object, account);
  const beneficiary = await account.getAddress();
  const allocated = ethers.parseUnits('21000000', decimals);
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 60;
  const duration = 365 * 24 * 60 * 60;
  const vaultDeployTx = VaultFactory.getDeployTransaction(dummyToken, beneficiary, allocated, startTime, duration);

  let estVaultGas;
  try {
    estVaultGas = await provider.estimateGas({
      from: await account.getAddress(),
      data: vaultDeployTx.data,
    });
  } catch (err) {
    console.warn('estimateGas for RewardsVault deploy failed:', err.message || err);
    estVaultGas = null;
  }
  console.log('Estimated gas for RewardsVault deploy:', estVaultGas ? estVaultGas.toString() : 'n/a');
  if (estVaultGas) console.log('Approx cost (BNB):', ethers.formatEther(estVaultGas * BigInt(gasPrice)));

  // Estimate gas for mint calls (call to mint on token contract). We can't estimate until token deployed; but we can estimate a typical mint gas using interface.
  // Create a contract instance with ABI only (no address) won't work; instead we can estimate by preparing a transaction to an address (placeholder)
  const placeholderTokenAddress = ethers.ZeroAddress; // not real; estimation may fail
  const mintAmount = ethers.parseUnits('21000000', decimals);
  const abi = OneW.abi;
  let estMintGas;
  try {
    const iface = new ethers.Interface(abi);
    const data = iface.encodeFunctionData('mint', [await account.getAddress(), mintAmount]);
    estMintGas = await provider.estimateGas({ from: await account.getAddress(), to: placeholderTokenAddress, data });
  } catch (err) {
    console.warn('estimateGas for mint failed (placeholder):', err.message || err);
    estMintGas = null;
  }
  console.log('Estimated gas for mint (approx):', estMintGas ? estMintGas.toString() : 'n/a');
  if (estMintGas) console.log('Approx cost (BNB):', ethers.formatEther(estMintGas * BigInt(gasPrice)));

  console.log('\nSummary:');
  console.log('OneW deploy gas:', estDeployGas ? estDeployGas.toString() : 'n/a');
  console.log('RewardsVault deploy gas:', estVaultGas ? estVaultGas.toString() : 'n/a');
  console.log('Mint gas (approx):', estMintGas ? estMintGas.toString() : 'n/a');
  console.log('Gas price used (gwei):', ethers.formatUnits(gasPrice, 'gwei'));
  console.log('-- End dry-run estimates --');
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
