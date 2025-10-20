#!/usr/bin/env bash
# deploy-ready.sh
# Usage: copy private key to .env, fund the wallet, then run this script locally to deploy when balance >= MIN_BNB

set -euo pipefail

MIN_BNB=${MIN_BNB:-0.01} # minimal BNB required to run deployment (adjust as needed)
ENV_FILE=.env

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found. Copy .env.example to .env and fill PRIVATE_KEY and BSC_RPC"
  exit 1
fi

# load PRIVATE_KEY and BSC_RPC
export $(grep -v '^#' $ENV_FILE | xargs)
if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "Error: PRIVATE_KEY not set in $ENV_FILE"
  exit 1
fi

RPC=${BSC_RPC:-https://bsc-dataseed.binance.org/}

node -e "(async()=>{const ethers=require('ethers');const rpc=process.env.BSC_RPC||'${RPC}';const provider=new ethers.JsonRpcProvider(rpc);const wallet=new ethers.Wallet(process.env.PRIVATE_KEY, provider);const bal=await provider.getBalance(wallet.address);console.log('ADDRESS:'+wallet.address);console.log('BALANCE_WEI:'+bal.toString());console.log('BALANCE_BNB:'+Number(ethers.formatEther(bal)));})();" > /tmp/deploy_balance.txt
ADDRESS=$(grep '^ADDRESS:' /tmp/deploy_balance.txt | cut -d: -f2)
BAL_BNB=$(grep '^BALANCE_BNB:' /tmp/deploy_balance.txt | cut -d: -f2)

echo "Address: $ADDRESS"
echo "Balance (BNB): $BAL_BNB"

# compare with MIN_BNB
awk -v b="$BAL_BNB" -v m="$MIN_BNB" 'BEGIN{if(b+0 >= m+0) exit 0; else exit 1}'

echo "Balance is sufficient (>= $MIN_BNB BNB). Proceeding to deploy..."

# run hardhat deploy
npx hardhat run scripts/deploy.js --network bsc

echo "Deploy script finished. Check output above for contract addresses."
