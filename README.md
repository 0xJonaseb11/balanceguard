# balanceguard

Balanceguard is a Uniswap v4 hook for Unichain Sepolia. It prices the strategy position at the pool price and charges more when a swap adds to the heavy side. A swap that moves the position back toward the target pays less.

The balanced growth strategy targets a 50% inventory split. The on target band is 45% to 55%. Fees stay between 0.05% and 0.50%, with a 0.30% base. Pause returns that base fee.

## Layout

`contracts/` holds the Foundry project. `FeeCurve` quotes the fee. `Inventory` turns liquidity and the current price into a value weight. `BalanceGuardHook` returns the quote from `beforeSwap`.

`web/` is the Next.js dashboard. The playground uses the same quote as the contracts.

## Test

```bash
forge test
```

## Dashboard

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. The opening scenario is 52.1% token0 and a 0.35% worsening fee.

## Deploy

Chain id 1301. PoolManager `0x00B036B58a818B1BC34d502D3fE730Db729e62AC`.

Copy `.env.example` and set `PRIVATE_KEY`.

```bash
forge script contracts/script/Deploy.s.sol --rpc-url https://sepolia.unichain.org --broadcast
```

Put the mined hook address in `NEXT_PUBLIC_HOOK_ADDRESS`, then restart the dashboard.
