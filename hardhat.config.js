require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    bsc: {
      url: process.env.BSC_RPC || "https://bsc-dataseed.binance.org/",
      accounts: [process.env.PRIVATE_KEY],
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
