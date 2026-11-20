// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

/*
 * @title FeeCurve
 * @author 0xJonaseb11
 * @notice Maps inventory weight to a swap fee inside the strategy bounds
*/
library FeeCurve {
    uint256 public constant WAD = 1e18;
    uint24 public constant PROTOCOL_FEE_CAP = 1_000_000;

    uint256 public constant BALANCED_GROWTH_TARGET_WAD = 0.5e18;
    uint24 public constant BALANCED_GROWTH_MIN_FEE = 500;
    uint24 public constant BALANCED_GROWTH_BASE_FEE = 3000;
    uint24 public constant BALANCED_GROWTH_MAX_FEE = 5000;
    uint256 public constant BALANCED_GROWTH_SLOPE = 23_810;

    struct Params {
        uint256 targetWad;
        uint24 minFee;
        uint24 baseFee;
        uint24 maxFee;
        uint256 slope;
    }

    error InvalidWeight();
    error InvalidFeeBounds();

    /*
     * @notice Returns the default balanced growth strategy
    */
    function balancedGrowth() internal pure returns (Params memory) {
        return Params({
            targetWad: BALANCED_GROWTH_TARGET_WAD,
            minFee: BALANCED_GROWTH_MIN_FEE,
            baseFee: BALANCED_GROWTH_BASE_FEE,
            maxFee: BALANCED_GROWTH_MAX_FEE,
            slope: BALANCED_GROWTH_SLOPE
        });
    }

    /*
     * @notice Reverts when the fee bounds break the target, min, base, max, or cap rules
     * @param params Fee curve parameters to check
    */
    function validate(Params memory params) internal pure {
        if (params.targetWad > WAD) revert InvalidFeeBounds();
        if (params.minFee > params.baseFee) revert InvalidFeeBounds();
        if (params.baseFee > params.maxFee) revert InvalidFeeBounds();
        if (params.maxFee >= PROTOCOL_FEE_CAP) revert InvalidFeeBounds();
    }

    /*
     * @notice Returns the swap fee for a weight, charging more on the worsening side
     * @param weight0Wad Token0 weight in WAD
     * @param zeroForOne True when the swap sells token0
     * @param params Fee curve parameters
    */
    function quote(uint256 weight0Wad, bool zeroForOne, Params memory params) internal pure returns (uint24) {
        if (weight0Wad > WAD) revert InvalidWeight();

        uint256 pressure = weight0Wad > params.targetWad ? weight0Wad - params.targetWad : params.targetWad - weight0Wad;
        uint256 adjustment = params.slope * pressure / WAD;
        bool worsens = zeroForOne == (weight0Wad > params.targetWad);
        uint256 fee = worsens ? uint256(params.baseFee) + adjustment : _discount(params.baseFee, adjustment);
        return _clamp(fee, params.minFee, params.maxFee);
    }

    /*
     * @notice Subtracts the adjustment from the base fee, floored at zero
     * @param baseFee Base fee
     * @param adjustment Fee reduction to subtract
    */
    function _discount(uint24 baseFee, uint256 adjustment) private pure returns (uint256) {
        if (adjustment >= baseFee) return 0;
        return uint256(baseFee) - adjustment;
    }

    /*
     * @notice Limits a fee to the min and max bounds
     * @param fee Fee before clamping
     * @param minFee Lowest allowed fee
     * @param maxFee Highest allowed fee
    */
    function _clamp(uint256 fee, uint24 minFee, uint24 maxFee) private pure returns (uint24) {
        if (fee < minFee) return minFee;
        if (fee > maxFee) return maxFee;
        return SafeCast.toUint24(fee);
    }
}
