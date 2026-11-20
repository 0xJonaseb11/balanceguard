// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {CurrencySettler} from "v4-core-test/utils/CurrencySettler.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";

contract GuardRouter {
    using CurrencySettler for Currency;

    IPoolManager public immutable poolManager;
    PoolKey public poolKey;

    error NotPoolManager();
    error ZeroAmount();
    error TooLittleReceived(uint256 amountOut, uint256 minAmountOut);

    constructor(IPoolManager manager, PoolKey memory key) {
        poolManager = manager;
        poolKey = key;
    }

    function swapExactIn(bool zeroForOne, uint128 amountIn, uint256 minAmountOut)
        external
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert ZeroAmount();
        amountOut = abi.decode(poolManager.unlock(abi.encode(msg.sender, zeroForOne, amountIn)), (uint256));
        if (amountOut < minAmountOut) revert TooLittleReceived(amountOut, minAmountOut);
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();

        (address trader, bool zeroForOne, uint128 amountIn) = abi.decode(rawData, (address, bool, uint128));
        PoolKey memory key = poolKey;
        BalanceDelta delta = poolManager.swap(key, _params(zeroForOne, amountIn), "");

        (Currency input, Currency output) = zeroForOne ? (key.currency0, key.currency1) : (key.currency1, key.currency0);
        (int128 paid, int128 received) =
            zeroForOne ? (delta.amount0(), delta.amount1()) : (delta.amount1(), delta.amount0());
        input.settle(poolManager, trader, uint256(uint128(-paid)), false);
        output.take(poolManager, trader, uint256(uint128(received)), false);
        return abi.encode(uint256(uint128(received)));
    }

    function _params(bool zeroForOne, uint128 amountIn) private pure returns (IPoolManager.SwapParams memory) {
        return IPoolManager.SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(uint256(amountIn)),
            sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });
    }
}
