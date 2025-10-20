#!/usr/bin/env bash
# watch-deploy.sh
# Watch .env for PRIVATE_KEY and poll the wallet balance. When balance >= MIN_BNB, run deploy-ready.sh

set -euo pipefail

ENV_FILE=.env
MIN_BNB=${MIN_BNB:-0.01}
POLL_INTERVAL=${POLL_INTERVAL:-15}

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found. Create it from .env.example and paste your PRIVATE_KEY locally."
  exit 1
fi

# load PRIVATE_KEY and BSC_RPC into env for node script
export $(grep -v '^#' $ENV_FILE | xargs)
if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "Error: PRIVATE_KEY not set in $ENV_FILE"
  exit 1
fi

RPC=${BSC_RPC:-https://bsc-dataseed.binance.org/}

echo "Watching wallet for funding. Address and checks will appear every ${POLL_INTERVAL}s."

echo "Address will be read from the PRIVATE_KEY in $ENV_FILE (not stored in the repo)."

while true; do
  # fetch balance via node to avoid external tooling
  OUT=$(node -e "(async()=>{const ethers=require('ethers');const rpc=process.env.BSC_RPC||'${RPC}';const provider=new ethers.JsonRpcProvider(rpc);const wallet=new ethers.Wallet(process.env.PRIVATE_KEY);const bal=await provider.getBalance(wallet.address);console.log(wallet.address+'|'+bal.toString()+'|'+Number(ethers.formatEther(bal)));})();" 2>/dev/null || true)
  if [ -z "$OUT" ]; then
    echo "Failed to read balance; retrying in ${POLL_INTERVAL}s..."
    sleep $POLL_INTERVAL
    continue
  fi
  ADDR=$(echo "$OUT" | cut -d'|' -f1)
  BAL_WEI=$(echo "$OUT" | cut -d'|' -f2)
  BAL_BNB=$(echo "$OUT" | cut -d'|' -f3)

  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Address: $ADDR - Balance: $BAL_BNB BNB"

  # compare
  awk -v b="$BAL_BNB" -v m="$MIN_BNB" 'BEGIN{if(b+0 >= m+0) exit 0; else exit 1}'
  if [ $? -eq 0 ]; then
    echo "Balance >= $MIN_BNB BNB — running deploy-ready.sh now"
    chmod +x ./deploy-ready.sh
    ./deploy-ready.sh
    exit 0
  fi

  sleep $POLL_INTERVAL
done
