// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {CurrencySettler} from "v4-core-test/utils/CurrencySettler.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {SafeCast} from "v4-core/libraries/SafeCast.sol";

/*
 * @title PoolSeed
 * @author 0xJonaseb11
 * @notice Initializes a pool and funds its first liquidity position
*/
contract PoolSeed {
    using CurrencySettler for Currency;

    IPoolManager public immutable POOL_MANAGER;

    error NotPoolManager();

    constructor(IPoolManager manager) {
        POOL_MANAGER = manager;
    }

    /*
     * @notice Initializes the pool and adds the first liquidity position
     * @param key Pool key to initialize
     * @param sqrtPriceX96 Starting sqrt price
     * @param params Liquidity parameters for the first position
    */
    function open(PoolKey calldata key, uint160 sqrtPriceX96, IPoolManager.ModifyLiquidityParams calldata params)
        external
    {
        POOL_MANAGER.initialize(key, sqrtPriceX96);
        POOL_MANAGER.unlock(abi.encode(msg.sender, key, params));
    }

    /*
     * @notice Adds liquidity and settles both tokens with the payer
     * @param rawData Encoded payer, pool key, and liquidity parameters
    */
    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        if (msg.sender != address(POOL_MANAGER)) revert NotPoolManager();

        (address payer, PoolKey memory key, IPoolManager.ModifyLiquidityParams memory params) =
            abi.decode(rawData, (address, PoolKey, IPoolManager.ModifyLiquidityParams));
        (BalanceDelta delta,) = POOL_MANAGER.modifyLiquidity(key, params, "");
        _settle(key.currency0, payer, delta.amount0());
        _settle(key.currency1, payer, delta.amount1());
        return "";
    }

    /*
     * @notice Pays what the payer owes the pool or takes what the pool owes
     * @param currency Currency to settle
     * @param payer Address that pays or receives the currency
     * @param amount Delta for the currency, negative when the payer owes the pool
    */
    function _settle(Currency currency, address payer, int128 amount) private {
        if (amount < 0) currency.settle(POOL_MANAGER, payer, SafeCast.toUint128(-amount), false);
        if (amount > 0) currency.take(POOL_MANAGER, payer, SafeCast.toUint128(amount), false);
    }
}
