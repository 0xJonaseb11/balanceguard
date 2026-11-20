import { parseAbi, parseAbiItem } from "viem";

export const hookAbi = parseAbi([
  "function quoteFee(bool zeroForOne) view returns (uint24 fee, uint256 weight0Wad)",
  "function inventory() view returns (uint256 amount0, uint256 amount1, uint160 sqrtPriceX96)",
  "function paused() view returns (bool)",
  "function strategy() view returns (uint256 targetWad, uint24 minFee, uint24 baseFee, uint24 maxFee, uint256 slope)",
  "function poolId() view returns (bytes32)",
  "function owner() view returns (address)",
  "function tickLower() view returns (int24)",
  "function tickUpper() view returns (int24)",
  "function setPaused(bool nextPaused)",
  "function setStrategy((uint256 targetWad, uint24 minFee, uint24 baseFee, uint24 maxFee, uint256 slope) nextStrategy)",
]);

export const routerAbi = parseAbi([
  "function poolKey() view returns (address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)",
  "function swapExactIn(bool zeroForOne, uint128 amountIn, uint256 minAmountOut) returns (uint256 amountOut)",
]);

export const tokenAbi = parseAbi([
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function faucet()",
]);

export const swapEvent = parseAbiItem(
  "event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)",
);
