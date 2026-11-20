# balanceguard

Balanceguard is a Uniswap v4 hook for Unichain Sepolia. It prices the strategy position at the pool price and charges more when a swap adds to the heavy side. A swap that moves the position back toward the target pays less.

The balanced growth strategy targets a 50% inventory split. The on target band is 45% to 55%. Fees stay between 0.05% and 0.50%, with a 0.30% base. Pause returns that base fee.

The weight comes from spot pool state. A large trade moves it within one block. The fee bounds cap what that trade can change.

## Layout

`contracts/` holds the Foundry project.

- `FeeCurve` quotes the fee.
- `Inventory` turns liquidity, the current price, and uncollected fees into a value weight.
- `BalanceGuardHook` reads the tracked position from the PoolManager and returns the quote from `beforeSwap`. `inventory()` exposes the same amounts the quote uses.
- `PoolSeed` opens the pool and adds the first position.
- `GuardRouter` swaps an exact input with a minimum output.
- `GuardToken` is a test ERC20 with a public `faucet()` that mints 100 tokens.

`web/` is the Next.js dashboard. It reads the hook, the router, and both tokens from chain. Charts rebuild the weight from PoolManager `Swap` events with a TypeScript port of `TickMath` and `Inventory`. The fee comes from the same curve as the contract.

## Test

```bash
forge test
cd web && npm run check:fee
```

`BalanceGuardForkTest` runs the deploy script on a Unichain Sepolia fork. It then trades through the router and checks the quote.

## Deploy

Chain id 1301. PoolManager `0x00B036B58a818B1BC34d502D3fE730Db729e62AC`.

Copy `.env.example` to `.env` and set `PRIVATE_KEY` for a funded Unichain Sepolia account.

```bash
forge script contracts/script/Deploy.s.sol --rpc-url https://sepolia.unichain.org --broadcast
```

The script mines the hook salt against the CREATE2 factory. It deploys two tokens, opens a dynamic fee pool through `PoolSeed`, records that position on the hook, and deploys the router. It then writes `web/.env.local` with the hook, the router, and the deploy block.

## Dashboard

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. With no hook address, the dashboard shows scenario data and a local simulation.

With a deployed hook:

1. Connect a browser wallet. The dashboard asks it to switch to Unichain Sepolia.
2. Press Get test tokens to mint both tokens.
3. Pick a direction and an amount, then run the trade. The first trade per token asks for an approval.
4. The cards, chart, and activity refresh after the receipt.

The manager wallet can pause quoting in Pool Settings and retune the bounds in Strategies. The hook checks the bounds again on chain.

## Local fork

Run the full flow against a local fork without spending testnet gas.

```bash
anvil --fork-url https://sepolia.unichain.org --chain-id 1301
PRIVATE_KEY=<anvil account key> NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545 \
  forge script contracts/script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

Add the local network to the wallet with RPC `http://127.0.0.1:8545` and chain id 1301. Import an anvil account to trade. Remove `NEXT_PUBLIC_RPC_URL` from `web/.env.local` before you point the dashboard at the real chain.
