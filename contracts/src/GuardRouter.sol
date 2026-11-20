// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {CurrencySettler} from "v4-core-test/utils/CurrencySettler.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {SafeCast} from "v4-core/libraries/SafeCast.sol";

/*
 * @title GuardRouter
 * @author 0xJonaseb11
 * @notice Exact input swap router for the Balanceguard pool
*/

contract GuardRouter {
    using CurrencySettler for Currency;

    IPoolManager public immutable POOL_MANAGER;
    PoolKey public poolKey;

    error NotPoolManager();
    error ZeroAmount();
    error TooLittleReceived(uint256 amountOut, uint256 minAmountOut);

    constructor(IPoolManager manager, PoolKey memory key) {
        POOL_MANAGER = manager;
        poolKey = key;
    }

    /*
     * @notice Swaps an exact input amount and reverts below the minimum output
     * @param zeroForOne True when selling token0
     * @param amountIn Exact amount of input token to swap
     * @param minAmountOut Minimum output amount to accept
    */
    function swapExactIn(bool zeroForOne, uint128 amountIn, uint256 minAmountOut)
        external
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert ZeroAmount();
        amountOut = abi.decode(POOL_MANAGER.unlock(abi.encode(msg.sender, zeroForOne, amountIn)), (uint256));
        if (amountOut < minAmountOut) revert TooLittleReceived(amountOut, minAmountOut);
    }

    /*
     * @notice Swaps through the pool and settles the trader balances
     * @param rawData Encoded trader, swap direction, and input amount
    */
    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        if (msg.sender != address(POOL_MANAGER)) revert NotPoolManager();

        (address trader, bool zeroForOne, uint128 amountIn) = abi.decode(rawData, (address, bool, uint128));
        PoolKey memory key = poolKey;
        BalanceDelta delta = POOL_MANAGER.swap(key, _params(zeroForOne, amountIn), "");

        (Currency input, Currency output) = zeroForOne ? (key.currency0, key.currency1) : (key.currency1, key.currency0);
        (int128 paid, int128 received) =
            zeroForOne ? (delta.amount0(), delta.amount1()) : (delta.amount1(), delta.amount0());
        input.settle(POOL_MANAGER, trader, SafeCast.toUint128(-paid), false);
        output.take(POOL_MANAGER, trader, SafeCast.toUint128(received), false);
        uint256 amountOut = SafeCast.toUint128(received);
        return abi.encode(amountOut);
    }

    /*
     * @notice Builds exact input swap params bounded by the min and max price
     * @param zeroForOne True when selling token0
     * @param amountIn Exact amount of input token
    */
    function _params(bool zeroForOne, uint128 amountIn) private pure returns (IPoolManager.SwapParams memory) {
        return IPoolManager.SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(uint256(amountIn)),
            sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });
    }
}
