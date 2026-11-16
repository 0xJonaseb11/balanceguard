// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

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

    function balancedGrowth() internal pure returns (Params memory) {
        return Params({
            targetWad: BALANCED_GROWTH_TARGET_WAD,
            minFee: BALANCED_GROWTH_MIN_FEE,
            baseFee: BALANCED_GROWTH_BASE_FEE,
            maxFee: BALANCED_GROWTH_MAX_FEE,
            slope: BALANCED_GROWTH_SLOPE
        });
    }

    function validate(Params memory params) internal pure {
        if (params.targetWad > WAD) revert InvalidFeeBounds();
        if (params.minFee > params.baseFee) revert InvalidFeeBounds();
        if (params.baseFee > params.maxFee) revert InvalidFeeBounds();
        if (params.maxFee >= PROTOCOL_FEE_CAP) revert InvalidFeeBounds();
    }

    function quote(uint256 weight0Wad, bool zeroForOne, Params memory params) internal pure returns (uint24) {
        if (weight0Wad > WAD) revert InvalidWeight();

        uint256 pressure = weight0Wad > params.targetWad ? weight0Wad - params.targetWad : params.targetWad - weight0Wad;
        uint256 adjustment = params.slope * pressure / WAD;
        bool worsens = zeroForOne == (weight0Wad > params.targetWad);
        uint256 fee = worsens ? uint256(params.baseFee) + adjustment : _discount(params.baseFee, adjustment);
        return _clamp(fee, params.minFee, params.maxFee);
    }

    function _discount(uint24 baseFee, uint256 adjustment) private pure returns (uint256) {
        if (adjustment >= baseFee) return 0;
        return uint256(baseFee) - adjustment;
    }

    function _clamp(uint256 fee, uint24 minFee, uint24 maxFee) private pure returns (uint24) {
        if (fee < minFee) return minFee;
        if (fee > maxFee) return maxFee;
        return uint24(fee);
    }
}
