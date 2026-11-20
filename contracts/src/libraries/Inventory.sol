// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {FixedPoint128} from "v4-core/libraries/FixedPoint128.sol";
import {FullMath} from "v4-core/libraries/FullMath.sol";
import {SqrtPriceMath} from "v4-core/libraries/SqrtPriceMath.sol";
import {FeeCurve} from "./FeeCurve.sol";

/*
 * @title Inventory
 * @author 0xJonaseb11
 * @notice Converts position liquidity and price into token amounts and a value weight
*/
library Inventory {
    error EmptyPosition();
    error InvalidPrice();
    error InvalidRange();

    /*
     * @notice Returns the token0 and token1 held by a range at a price, rounded down
     * @param liquidity Liquidity in the range
     * @param sqrtPriceX96 Current pool price as a sqrt price
     * @param sqrtLowerX96 Sqrt price at the lower tick
     * @param sqrtUpperX96 Sqrt price at the upper tick
    */
    function amounts(uint128 liquidity, uint160 sqrtPriceX96, uint160 sqrtLowerX96, uint160 sqrtUpperX96)
        internal
        pure
        returns (uint256 amount0, uint256 amount1)
    {
        if (sqrtLowerX96 >= sqrtUpperX96) revert InvalidRange();
        if (sqrtPriceX96 == 0) revert InvalidPrice();
        if (liquidity == 0) return (0, 0);

        if (sqrtPriceX96 <= sqrtLowerX96) {
            amount0 = SqrtPriceMath.getAmount0Delta(sqrtLowerX96, sqrtUpperX96, liquidity, false);
        } else if (sqrtPriceX96 >= sqrtUpperX96) {
            amount1 = SqrtPriceMath.getAmount1Delta(sqrtLowerX96, sqrtUpperX96, liquidity, false);
        } else {
            amount0 = SqrtPriceMath.getAmount0Delta(sqrtPriceX96, sqrtUpperX96, liquidity, false);
            amount1 = SqrtPriceMath.getAmount1Delta(sqrtLowerX96, sqrtPriceX96, liquidity, false);
        }
    }

    /*
     * @notice Returns the token0 share of the position value in WAD
     * @param amount0 Amount of token0
     * @param amount1 Amount of token1
     * @param sqrtPriceX96 Current pool price as a sqrt price
    */
    function weight0(uint256 amount0, uint256 amount1, uint160 sqrtPriceX96) internal pure returns (uint256) {
        if (amount0 == 0 && amount1 == 0) revert EmptyPosition();
        if (sqrtPriceX96 == 0) revert InvalidPrice();

        uint256 value0 = FullMath.mulDiv(amount0, sqrtPriceX96, 1 << 96);
        value0 = FullMath.mulDiv(value0, sqrtPriceX96, 1 << 96);
        uint256 total = value0 + amount1;
        if (total == 0) return 0;
        return FullMath.mulDiv(value0, FeeCurve.WAD, total);
    }

    /*
     * @notice Returns uncollected fees from the fee growth inside a range
     * @param liquidity Liquidity in the range
     * @param feeGrowthInsideX128 Fee growth inside the range now
     * @param feeGrowthInsideLastX128 Fee growth inside the range at the last update
    */
    function owed(uint128 liquidity, uint256 feeGrowthInsideX128, uint256 feeGrowthInsideLastX128)
        internal
        pure
        returns (uint256)
    {
        unchecked {
            return FullMath.mulDiv(feeGrowthInsideX128 - feeGrowthInsideLastX128, liquidity, FixedPoint128.Q128);
        }
    }
}
