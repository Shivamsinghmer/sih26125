import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      // OpenZeppelin v5.5+ uses the `mcopy` opcode, which requires Cancun.
      // The Besu genesis must therefore enable cancunTime — see infra/besu.
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    besu: {
      url: process.env.BESU_RPC_URL ?? "http://127.0.0.1:8545",
      gasPrice: 0,
    },
  },
};

export default config;
