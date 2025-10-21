import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config();

export default {
  solidity: "0.8.20",
  networks: {
    bsc: {
      url: process.env.BSC_RPC,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
