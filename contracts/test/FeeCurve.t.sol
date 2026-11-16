// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {FeeCurve} from "../src/libraries/FeeCurve.sol";

contract FeeCurveHarness {
    function quote(uint256 weight0Wad, bool zeroForOne, FeeCurve.Params memory params) external pure returns (uint24) {
        return FeeCurve.quote(weight0Wad, zeroForOne, params);
    }

    function validate(FeeCurve.Params memory params) external pure {
        FeeCurve.validate(params);
    }

    function balancedGrowth() external pure returns (FeeCurve.Params memory) {
        return FeeCurve.balancedGrowth();
    }
}

contract FeeCurveTest is Test {
    FeeCurveHarness internal harness;

    uint256 internal constant WEIGHT_521 = 0.521e18;
    uint256 internal constant WEIGHT_550 = 0.55e18;
    uint256 internal constant WEIGHT_450 = 0.45e18;

    function setUp() public {
        harness = new FeeCurveHarness();
    }

    function test_balancedGrowthMatchesDashboard() public view {
        FeeCurve.Params memory params = harness.balancedGrowth();

        assertEq(harness.quote(WEIGHT_521, true, params), 3500);
        assertEq(harness.quote(WEIGHT_521, false, params), 2500);
        assertEq(harness.quote(params.targetWad, true, params), params.baseFee);
        assertEq(harness.quote(params.targetWad, false, params), params.baseFee);
    }

    function test_bandEdgeMovesBothDirections() public view {
        FeeCurve.Params memory params = harness.balancedGrowth();

        assertEq(harness.quote(WEIGHT_550, true, params), 4190);
        assertEq(harness.quote(WEIGHT_550, false, params), 1810);
        assertEq(harness.quote(WEIGHT_450, true, params), 1810);
        assertEq(harness.quote(WEIGHT_450, false, params), 4190);
    }

    function test_extremesClampToStrategyBounds() public view {
        FeeCurve.Params memory params = harness.balancedGrowth();

        assertEq(harness.quote(FeeCurve.WAD, true, params), params.maxFee);
        assertEq(harness.quote(FeeCurve.WAD, false, params), params.minFee);
        assertEq(harness.quote(0, true, params), params.minFee);
        assertEq(harness.quote(0, false, params), params.maxFee);
    }

    function test_flatSlopeKeepsBaseFee() public view {
        FeeCurve.Params memory params = harness.balancedGrowth();
        params.slope = 0;

        assertEq(harness.quote(WEIGHT_521, true, params), params.baseFee);
        assertEq(harness.quote(0, false, params), params.baseFee);
    }

    function test_validateAcceptsBalancedGrowth() public view {
        harness.validate(harness.balancedGrowth());
    }

    function test_validateRejectsBrokenBounds() public {
        FeeCurve.Params memory params = harness.balancedGrowth();

        params.targetWad = FeeCurve.WAD + 1;
        vm.expectRevert(FeeCurve.InvalidFeeBounds.selector);
        harness.validate(params);

        params = harness.balancedGrowth();
        params.minFee = params.baseFee + 1;
        vm.expectRevert(FeeCurve.InvalidFeeBounds.selector);
        harness.validate(params);

        params = harness.balancedGrowth();
        params.maxFee = params.baseFee - 1;
        vm.expectRevert(FeeCurve.InvalidFeeBounds.selector);
        harness.validate(params);

        params = harness.balancedGrowth();
        params.maxFee = FeeCurve.PROTOCOL_FEE_CAP;
        vm.expectRevert(FeeCurve.InvalidFeeBounds.selector);
        harness.validate(params);
    }

    function test_quoteRejectsWeightAboveWad() public {
        FeeCurve.Params memory params = harness.balancedGrowth();
        vm.expectRevert(FeeCurve.InvalidWeight.selector);
        harness.quote(FeeCurve.WAD + 1, true, params);
    }

    function testFuzz_quoteStaysInsideBounds(
        uint256 weightWad,
        uint24 minFee,
        uint24 baseFee,
        uint24 maxFee,
        uint256 slope,
        bool zeroForOne
    ) public view {
        weightWad = bound(weightWad, 0, FeeCurve.WAD);
        minFee = uint24(bound(uint256(minFee), 0, 100_000));
        baseFee = uint24(bound(uint256(baseFee), uint256(minFee), 200_000));
        maxFee = uint24(bound(uint256(maxFee), uint256(baseFee), 500_000));
        slope = bound(slope, 0, 1e12);

        FeeCurve.Params memory params = FeeCurve.Params({
            targetWad: FeeCurve.WAD / 2, minFee: minFee, baseFee: baseFee, maxFee: maxFee, slope: slope
        });

        uint24 fee = harness.quote(weightWad, zeroForOne, params);
        assertGe(uint256(fee), uint256(minFee));
        assertLe(uint256(fee), uint256(maxFee));
    }

    function testFuzz_directionFollowsWeight(uint256 weightWad) public view {
        weightWad = bound(weightWad, 0, FeeCurve.WAD);
        FeeCurve.Params memory params = harness.balancedGrowth();
        uint24 zeroForOne = harness.quote(weightWad, true, params);
        uint24 oneForZero = harness.quote(weightWad, false, params);

        if (weightWad > params.targetWad) {
            assertGe(uint256(zeroForOne), uint256(oneForZero));
        } else if (weightWad < params.targetWad) {
            assertGe(uint256(oneForZero), uint256(zeroForOne));
        } else {
            assertEq(uint256(zeroForOne), uint256(params.baseFee));
            assertEq(uint256(oneForZero), uint256(params.baseFee));
        }
    }
}
