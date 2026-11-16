// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {FeeCurve} from "../src/libraries/FeeCurve.sol";
import {Inventory} from "../src/libraries/Inventory.sol";

contract InventoryHarness {
    function amounts(uint128 liquidity, uint160 sqrtPriceX96, uint160 sqrtLowerX96, uint160 sqrtUpperX96)
        external
        pure
        returns (uint256 amount0, uint256 amount1)
    {
        return Inventory.amounts(liquidity, sqrtPriceX96, sqrtLowerX96, sqrtUpperX96);
    }

    function weight0(uint256 amount0, uint256 amount1, uint160 sqrtPriceX96) external pure returns (uint256) {
        return Inventory.weight0(amount0, amount1, sqrtPriceX96);
    }
}

contract InventoryTest is Test {
    InventoryHarness internal harness;

    uint160 internal sqrtOne;
    uint160 internal sqrtLower;
    uint160 internal sqrtUpper;

    function setUp() public {
        harness = new InventoryHarness();
        sqrtOne = TickMath.getSqrtPriceAtTick(0);
        sqrtLower = TickMath.getSqrtPriceAtTick(-600);
        sqrtUpper = TickMath.getSqrtPriceAtTick(600);
    }

    function test_priceOneSplitsEqualAmountsInHalf() public view {
        uint256 weight = harness.weight0(2e18, 1e18, sqrtOne);
        assertEq(weight, 666666666666666666);
        assertEq(harness.weight0(1e18, 1e18, sqrtOne), FeeCurve.WAD / 2);
    }

    function test_oneSidedValuePinsTheWeight() public view {
        assertEq(harness.weight0(5e18, 0, sqrtOne), FeeCurve.WAD);
        assertEq(harness.weight0(0, 5e18, sqrtOne), 0);
    }

    function test_rangeSides() public view {
        (uint256 amount0, uint256 amount1) = harness.amounts(1e18, sqrtOne, sqrtLower, sqrtUpper);
        assertGt(amount0, 0);
        assertGt(amount1, 0);

        (amount0, amount1) = harness.amounts(1e18, TickMath.getSqrtPriceAtTick(-1200), sqrtLower, sqrtUpper);
        assertGt(amount0, 0);
        assertEq(amount1, 0);

        (amount0, amount1) = harness.amounts(1e18, TickMath.getSqrtPriceAtTick(1200), sqrtLower, sqrtUpper);
        assertEq(amount0, 0);
        assertGt(amount1, 0);
    }

    function test_zeroLiquidityReturnsZeroAmounts() public view {
        (uint256 amount0, uint256 amount1) = harness.amounts(0, sqrtOne, sqrtLower, sqrtUpper);
        assertEq(amount0, 0);
        assertEq(amount1, 0);
    }

    function test_rejectsEmptyAndBrokenInputs() public {
        vm.expectRevert(Inventory.EmptyPosition.selector);
        harness.weight0(0, 0, sqrtOne);

        vm.expectRevert(Inventory.InvalidPrice.selector);
        harness.weight0(1, 1, 0);

        vm.expectRevert(Inventory.InvalidRange.selector);
        harness.amounts(1e18, sqrtOne, sqrtUpper, sqrtLower);

        vm.expectRevert(Inventory.InvalidPrice.selector);
        harness.amounts(1e18, 0, sqrtLower, sqrtUpper);
    }
}
