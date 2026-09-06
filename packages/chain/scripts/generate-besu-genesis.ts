/**
 * Generate the Hyperledger Besu QBFT network configuration.
 *
 *   bun run scripts/generate-besu-genesis.ts
 *
 * QBFT encodes its validator set inside the genesis `extraData` field as RLP.
 * Hand-writing that is how these configurations go wrong silently — the chain
 * starts, produces no blocks, and the reason is buried in a hex string. So it
 * is derived here from the node keys instead.
 *
 * Writes into infra/besu/:
 *   genesis.json          the chain definition, validators baked in
 *   static-nodes.json     peer list, so the nodes find each other without discovery
 *   nodes/nodeN/key       each validator's node key
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { secp256k1 } from "@noble/curves/secp256k1";
import { toRlp, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const OUT_DIR = fileURLToPath(new URL("../../../infra/besu", import.meta.url));

const CHAIN_ID = 26125;
const VALIDATOR_COUNT = 4;
const P2P_PORT = 30303;
/**
 * Besu rejects a hostname in a static-nodes enode — it requires a literal IP.
 * The compose file pins each container to the matching address on this subnet.
 */
const SUBNET_PREFIX = "172.28.0";
const FIRST_HOST_OCTET = 11;

/**
 * Fixed node keys. Real deployments generate these per environment and never
 * commit them; these exist so the demo network is reproducible and so the
 * validator addresses in genesis always match the keys the containers load.
 * They are worthless outside this local network.
 */
const NODE_KEYS: Hex[] = [
  "0x8f2a559490d9e6ad7d5f6c1e35ca0d0f0b4f8b5b0c3a2d1e0f9a8b7c6d5e4f31",
  "0x2b1c3d4e5f60718293a4b5c6d7e8f9012a3b4c5d6e7f8091a2b3c4d5e6f70812",
  "0x7d6c5b4a39281706f5e4d3c2b1a0918273645342f1e0d9c8b7a695847362514f",
  "0x4e3d2c1b0a99887766554433221100ffeeddccbbaa99887766554433221100ff",
];

/**
 * Departments holding validators. Stated here because it is the answer to
 * "what stops one administrator rewriting history" — rewriting requires
 * collusion across departments, not one compromised machine.
 */
const VALIDATOR_OWNERS = [
  "IT Security",
  "Internal Audit",
  "Radar Systems Division",
  "Communications Division",
];

/** Accounts pre-funded so the same scripts work against Besu and Hardhat. */
const PREFUNDED = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
];

const validators = NODE_KEYS.slice(0, VALIDATOR_COUNT).map((key, index) => {
  const account = privateKeyToAccount(key);
  // The enode identifier is the uncompressed public key without its 0x04 prefix.
  const publicKey = secp256k1.getPublicKey(key.slice(2), false);
  const enodeId = Buffer.from(publicKey).toString("hex").slice(2);
  return {
    name: `besu-node-${index + 1}`,
    key,
    address: account.address,
    enodeId,
    ip: `${SUBNET_PREFIX}.${FIRST_HOST_OCTET + index}`,
    owner: VALIDATOR_OWNERS[index] ?? "Unassigned",
  };
});

/**
 * QBFT extraData is RLP([vanity, validators, vote, round, seals]) — 32 zero
 * bytes of vanity, the validator addresses, then three empty fields that only
 * carry data once the chain is running.
 */
const extraData = toRlp([
  `0x${"00".repeat(32)}`,
  validators.map((v) => v.address.toLowerCase() as Hex),
  [],
  // Round number, as an RLP scalar. Zero must encode as empty — four zero bytes
  // is a valid string but not a valid scalar, and Besu rejects the genesis with
  // "Invalid scalar, has leading zeros bytes".
  "0x",
  [],
]);

const genesis = {
  config: {
    chainId: CHAIN_ID,
    berlinBlock: 0,
    londonBlock: 0,
    shanghaiTime: 0,
    // OpenZeppelin v5.5+ emits the `mcopy` opcode, which needs Cancun. This must
    // stay in step with `evmVersion` in packages/contracts/hardhat.config.ts, or
    // the identical bytecode that runs on Hardhat will fail here.
    cancunTime: 0,
    zeroBaseFee: true,
    qbft: {
      blockperiodseconds: 2,
      epochlength: 30000,
      requesttimeoutseconds: 4,
    },
  },
  nonce: "0x0",
  timestamp: "0x0",
  gasLimit: "0x1fffffffffffff",
  difficulty: "0x1",
  mixHash: "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365",
  coinbase: "0x0000000000000000000000000000000000000000",
  extraData,
  alloc: Object.fromEntries(
    PREFUNDED.map((address) => [
      address.toLowerCase().replace(/^0x/, ""),
      { balance: "0x21e19e0c9bab2400000" },
    ]),
  ),
};

const staticNodes = validators.map(
  (v) => `enode://${v.enodeId}@${v.ip}:${P2P_PORT}`,
);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/genesis.json`, `${JSON.stringify(genesis, null, 2)}\n`);
writeFileSync(`${OUT_DIR}/static-nodes.json`, `${JSON.stringify(staticNodes, null, 2)}\n`);

for (const validator of validators) {
  const dir = `${OUT_DIR}/nodes/${validator.name}`;
  mkdirSync(dir, { recursive: true });
  // Besu expects the node key as raw hex with no 0x prefix and no trailing newline.
  writeFileSync(`${dir}/key`, validator.key.slice(2));
}

console.log(`Wrote Besu QBFT config for ${validators.length} validators to infra/besu/\n`);
console.table(
  validators.map((v) => ({ node: v.name, ip: v.ip, validator: v.address, held_by: v.owner })),
);
console.log(`\nchainId ${CHAIN_ID}, gas price 0, 2s blocks`);
console.log(`extraData ${extraData.slice(0, 26)}… (${(extraData.length - 2) / 2} bytes)`);
console.log("\nStart with:  docker compose -f infra/besu/docker-compose.yml up -d");
