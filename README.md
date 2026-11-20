# balanceguard

Balanceguard is a Uniswap v4 hook for Unichain Sepolia. It sets the swap fee from the pool's inventory. A swap that pushes the position further from target pays more. A swap that moves it back pays less.

The balanced growth strategy targets a 50% token0 value share. The on target band is 45% to 55%. Fees stay between 0.05% and 0.50%, with a 0.30% base. Pausing returns the base fee.

Spot weight moves with each trade, so one large trade can shift it within a single block. The fee bounds cap how far the fee can move.

## Deployed contracts

Chain id 1301. Deploy block [68336438](https://sepolia.uniscan.xyz/block/68336438).

| Contract | Address |
| --- | --- |
| BalanceGuardHook | [0x4d36E194e907988F088f4315627E0428b9486080](https://sepolia.uniscan.xyz/address/0x4d36E194e907988F088f4315627E0428b9486080) |
| GuardRouter | [0xdEF7d174642f3396d5af181dC9A602859db49586](https://sepolia.uniscan.xyz/address/0xdEF7d174642f3396d5af181dC9A602859db49586) |
| PoolSeed | [0xcF8e0CeFeeCa887af0d1421896FB8bAF0697101b](https://sepolia.uniscan.xyz/address/0xcF8e0CeFeeCa887af0d1421896FB8bAF0697101b) |
| GTB token0 | [0x025E35cB1AFE15BA3890fbd08D22195fAf18a1b1](https://sepolia.uniscan.xyz/address/0x025E35cB1AFE15BA3890fbd08D22195fAf18a1b1) |
| GTA token1 | [0x5d46F24109fF5E0f8ef50913Fc673b8CAf30587d](https://sepolia.uniscan.xyz/address/0x5d46F24109fF5E0f8ef50913Fc673b8CAf30587d) |
| PoolManager (Uniswap v4) | [0x00B036B58a818B1BC34d502D3fE730Db729e62AC](https://sepolia.uniscan.xyz/address/0x00B036B58a818B1BC34d502D3fE730Db729e62AC) |

## Layout

`contracts/` holds the Foundry project.

- `FeeCurve` quotes the fee from the weight.
- `Inventory` turns liquidity, price, and uncollected fees into a value weight.
- `BalanceGuardHook` reads the tracked position from the PoolManager and returns the quote from `beforeSwap`. `inventory()` exposes the amounts the quote uses.
- `PoolSeed` opens the pool and adds the first position.
- `GuardRouter` swaps an exact input with a minimum output.
- `GuardToken` is a test ERC20 with a public `faucet()` that mints 100 tokens.

`web/` is the Next.js dashboard. It reads the hook, the router, and both tokens from chain. The chart rebuilds the weight from PoolManager `Swap` events with a TypeScript port of `TickMath` and `Inventory`. The fee comes from the same curve as the contract.

## Test

```bash
forge test
cd web && npm run check:fee
```

`BalanceGuardForkTest` runs the deploy script on a Unichain Sepolia fork, trades through the router, and checks the quote.

## Deploy

Copy `.env.example` to `.env` and set `PRIVATE_KEY` with the `0x` prefix. The account pays gas in Unichain Sepolia ETH. 0.01 ETH covers the full deploy.

```bash
forge script contracts/script/Deploy.s.sol --rpc-url https://sepolia.unichain.org --broadcast
```

The script mines the hook salt against the CREATE2 factory. It deploys two tokens, opens a dynamic fee pool through `PoolSeed`, records that position on the hook, and deploys the router.

After the broadcast finishes, write the dashboard env file from the receipts:

```bash
cd web
npm run sync:deployment
```

The command reads `broadcast/Deploy.s.sol/1301/run-latest.json` and writes `web/.env.local` with the hook, the router, and the deploy block. It stops with an error when the broadcast has no receipts, so a failed deploy leaves no addresses behind.

## Dashboard

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. With no hook address, the dashboard shows scenario data and a local simulation. With a deployed hook, it reads the live pool.

1. Connect a browser wallet. The dashboard asks it to switch to Unichain Sepolia.
2. Press Get test tokens to mint both tokens.
3. Pick a direction and an amount, then run the trade. The first trade per token asks for an approval.
4. The cards, chart, and activity refresh after the receipt.

The manager wallet can pause quoting in Pool Settings and retune the bounds in Strategies. The hook checks the bounds again on chain.

## Production

The Vercel project builds from the `web` directory. Set these variables for Production, Preview, and Development, using the values from `web/.env.local`:

- `NEXT_PUBLIC_HOOK_ADDRESS`
- `NEXT_PUBLIC_ROUTER_ADDRESS`
- `NEXT_PUBLIC_DEPLOY_BLOCK`

Leave `NEXT_PUBLIC_RPC_URL` unset to use the public Unichain Sepolia RPC. Next.js reads `NEXT_PUBLIC` values at build time, so redeploy after you change any of them. A new hook deploy gives new addresses, so update all three together.

## Local fork

Run the full flow against a local fork without spending testnet gas.

```bash
anvil --fork-url https://sepolia.unichain.org --chain-id 1301
PRIVATE_KEY=<anvil account key> forge script contracts/script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
cd web
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545 npm run sync:deployment
```

Add the local network to the wallet with RPC `http://127.0.0.1:8545` and chain id 1301. Import an anvil account to trade. After a real deploy, run `npm run sync:deployment` again without `NEXT_PUBLIC_RPC_URL`.
