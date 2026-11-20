// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {CurrencySettler} from "v4-core-test/utils/CurrencySettler.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";

contract PoolSeed {
    using CurrencySettler for Currency;

    IPoolManager public immutable poolManager;

    error NotPoolManager();

    constructor(IPoolManager manager) {
        poolManager = manager;
    }

    function open(PoolKey calldata key, uint160 sqrtPriceX96, IPoolManager.ModifyLiquidityParams calldata params)
        external
    {
        poolManager.initialize(key, sqrtPriceX96);
        poolManager.unlock(abi.encode(msg.sender, key, params));
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();

        (address payer, PoolKey memory key, IPoolManager.ModifyLiquidityParams memory params) =
            abi.decode(rawData, (address, PoolKey, IPoolManager.ModifyLiquidityParams));
        (BalanceDelta delta,) = poolManager.modifyLiquidity(key, params, "");
        _settle(key.currency0, payer, delta.amount0());
        _settle(key.currency1, payer, delta.amount1());
        return "";
    }

    function _settle(Currency currency, address payer, int128 amount) private {
        if (amount < 0) currency.settle(poolManager, payer, uint256(uint128(-amount)), false);
        if (amount > 0) currency.take(poolManager, payer, uint256(uint128(amount)), false);
    }
}
