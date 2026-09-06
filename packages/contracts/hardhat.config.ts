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
      // Besu unlocks no accounts, so the deployer key is supplied here. These are
      // the same published Hardhat development keys the local chain uses, and are
      // pre-funded in infra/besu/genesis.json so the identical scripts run against
      // either network.
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
      ],
    },
  },
};

export default config;
