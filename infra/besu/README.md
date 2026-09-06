# Besu QBFT network

The deployment target. Daily development runs against Hardhat Network for speed;
this is where the identical bytecode goes before the final.

## Status — verified

This network has been started and deployed to. What was confirmed:

- Four QBFT validators, matching exactly the addresses in `genesis.json`
  (`qbft_getValidatorsByBlockNumber`), with 3 peers connected.
- `eth_chainId` returns `0x660d` (26125) and `eth_gasPrice` returns `0`.
- Blocks produce on the 2-second period.
- All five contracts deploy with the identical bytecode used on Hardhat — which
  also confirms the Cancun/`mcopy` alignment described below.
- A credential-gated transfer **reverts on Besu** and decodes to
  "Recipient was never issued a Manager credential"
  (`pnpm --filter @sih26125/chain besu:verify`).

Three things had to be fixed to get there, all recorded here because they are
the failures anyone reproducing this will hit:

1. **`static-nodes.json` cannot live under `/data`.** Besu's entrypoint chowns
   that directory on start and a read-only bind mount inside it fails. It is
   mounted at `/config` and passed with `--static-nodes-file`.
2. **Besu rejects a hostname in a static-nodes enode.** Docker service names do
   not work; the compose file pins each container to a fixed address on a
   dedicated subnet, and the generator emits those addresses.
3. **The QBFT `extraData` round field is an RLP *scalar*.** Encoding zero as
   four zero bytes is a valid string but an invalid scalar, and Besu refuses the
   genesis with "Invalid scalar, has leading zeros bytes". Zero must encode as
   empty.

## Running it

```bash
pnpm --filter @sih26125/chain besu:genesis     # regenerate genesis + keys
docker compose -f infra/besu/docker-compose.yml up -d
docker compose -f infra/besu/docker-compose.yml logs -f besu-node-1
```

Blocks should appear every two seconds. If they do not, the validator set in
`extraData` disagrees with the loaded node keys — regenerate rather than editing
by hand.

Check it is producing:

```bash
curl -s -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545
```

Then deploy the same contracts to it:

```bash
BESU_RPC_URL=http://127.0.0.1:8545 pnpm --filter @sih26125/contracts hardhat run scripts/deploy.ts --network besu
```

## The one thing that will bite

`cancunTime` in `genesis.json` must stay in step with `evmVersion: "cancun"` in
`packages/contracts/hardhat.config.ts`. OpenZeppelin v5.5+ emits the `mcopy`
opcode, which Cancun introduced. If the genesis is behind, contracts that deploy
cleanly on Hardhat will fail here with an invalid-opcode error that does not
mention Cancun anywhere.

If Cancun causes trouble on the Besu version pinned in the compose file, the
fallback is to drop both to Shanghai — set `evmVersion: "shanghai"` in the
Hardhat config and remove `cancunTime` — and recompile. Do not change only one.

## Why four nodes, and why this matters to a judge

The validators are held by different departments:

| Node | Held by |
|---|---|
| besu-node-1 | IT Security |
| besu-node-2 | Internal Audit |
| besu-node-3 | Radar Systems Division |
| besu-node-4 | Communications Division |

QBFT tolerates one faulty validator out of four. The point is not fault
tolerance though — it is that rewriting history requires collusion across
departments rather than one administrator with database access. That is the
whole answer to "why not just a Postgres table with an audit log".

Gas price is zero, membership is permissioned, and nothing here reaches the
internet.

## Offline / venue operation

Pull the images before travelling and carry them on the same USB stick as the
repo:

```bash
docker pull hyperledger/besu:24.12.2
docker pull postgres:16
docker save hyperledger/besu:24.12.2 postgres:16 -o sih26125-images.tar
```

At the venue:

```bash
docker load -i sih26125-images.tar
```

Worth doing even on a good network. The pitch is that this runs air-gapped; a
demo that pauses to reach Docker Hub quietly contradicts it.

## Node keys

`nodes/*/key` are committed so the network is reproducible and the demo starts
identically every time. They are worthless outside this local chain. A real
deployment generates them per environment with
`besu operator generate-blockchain-config` and never commits them.
