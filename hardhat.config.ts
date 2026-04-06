import { HardhatUserConfig } from "hardhat/config";
import hardhatIgnitionEthers from "@nomicfoundation/hardhat-ignition-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  plugins: [hardhatIgnitionEthers],
  solidity: "0.8.28",
  networks: {
    sepolia: {
      type: "http", // <- O Hardhat 3 exige este campo agora
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
