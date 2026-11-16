// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IERC20Minimal} from "v4-core/interfaces/external/IERC20Minimal.sol";
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

    function open(
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        IPoolManager.ModifyLiquidityParams calldata params,
        uint256 fund0,
        uint256 fund1
    ) external {
        _pull(key, fund0, fund1);
        poolManager.initialize(key, sqrtPriceX96);
        poolManager.unlock(abi.encode(key, params));
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();

        (PoolKey memory key, IPoolManager.ModifyLiquidityParams memory params) =
            abi.decode(rawData, (PoolKey, IPoolManager.ModifyLiquidityParams));
        (BalanceDelta delta,) = poolManager.modifyLiquidity(key, params, "");
        _settle(key.currency0, delta.amount0());
        _settle(key.currency1, delta.amount1());
        return "";
    }

    function _pull(PoolKey calldata key, uint256 fund0, uint256 fund1) private {
        IERC20Minimal(Currency.unwrap(key.currency0)).transferFrom(msg.sender, address(this), fund0);
        IERC20Minimal(Currency.unwrap(key.currency1)).transferFrom(msg.sender, address(this), fund1);
    }

    function _settle(Currency currency, int128 amount) private {
        if (amount < 0) currency.settle(poolManager, address(this), uint256(uint128(-amount)), false);
        if (amount > 0) currency.take(poolManager, address(this), uint256(uint128(amount)), false);
    }
}
