// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {PoolId} from "v4-core/types/PoolId.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {FeeCurve} from "./libraries/FeeCurve.sol";
import {Inventory} from "./libraries/Inventory.sol";

/*
 * @title BalanceGuardHook
 * @author 0xJonaseb11
 * @notice Dynamic fee hook that prices swaps from the tracked position inventory
*/
contract BalanceGuardHook is IHooks {
    using LPFeeLibrary for uint24;
    using StateLibrary for IPoolManager;

    IPoolManager public immutable POOL_MANAGER;
    address public owner;
    FeeCurve.Params public strategy;
    address public positionOwner;
    int24 public tickLower;
    int24 public tickUpper;
    bytes32 public positionSalt;
    bool public paused;
    PoolId public poolId;

    error NotPoolManager();
    error NotOwner();
    error NotDynamicFee();
    error InvalidPosition();
    error HookNotEnabled();

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    constructor(IPoolManager manager, address initialOwner) {
        POOL_MANAGER = manager;
        owner = initialOwner;
        strategy = FeeCurve.balancedGrowth();
        Hooks.validateHookPermissions(
            IHooks(address(this)),
            Hooks.Permissions({
                beforeInitialize: true,
                afterInitialize: false,
                beforeAddLiquidity: false,
                afterAddLiquidity: false,
                beforeRemoveLiquidity: false,
                afterRemoveLiquidity: false,
                beforeSwap: true,
                afterSwap: false,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: false,
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            })
        );
    }

    /*
     * @notice Reverts unless the caller is the owner
    */
    function _onlyOwner() private view {
        if (msg.sender != owner) revert NotOwner();
    }

    /*
     * @notice Replaces the fee bounds after validating them
     * @param nextStrategy Fee bounds to validate and store
    */
    function setStrategy(FeeCurve.Params calldata nextStrategy) external onlyOwner {
        FeeCurve.validate(nextStrategy);
        strategy = nextStrategy;
    }

    /*
     * @notice Sets the position whose inventory drives the fee
     * @param nextOwner Address that owns the position
     * @param lower Lower tick of the range
     * @param upper Upper tick of the range
     * @param nextSalt Salt that identifies the position
    */
    function setPosition(address nextOwner, int24 lower, int24 upper, bytes32 nextSalt) external onlyOwner {
        if (nextOwner == address(0) || lower >= upper || lower < TickMath.MIN_TICK || upper > TickMath.MAX_TICK) {
            revert InvalidPosition();
        }
        positionOwner = nextOwner;
        tickLower = lower;
        tickUpper = upper;
        positionSalt = nextSalt;
    }

    /*
     * @notice Pauses adaptive pricing so every swap pays the base fee
     * @param nextPaused True to pause adaptive pricing
    */
    function setPaused(bool nextPaused) external onlyOwner {
        paused = nextPaused;
    }

    /*
     * @notice Quotes the swap fee and the token0 weight for a swap direction
     * @param zeroForOne True when the swap sells token0
    */
    function quoteFee(bool zeroForOne) public view returns (uint24 fee, uint256 weight0Wad) {
        FeeCurve.Params memory params = strategy;
        if (paused) return (params.baseFee, params.targetWad);

        (uint256 amount0, uint256 amount1, uint160 sqrtPriceX96) = inventory();
        if (amount0 == 0 && amount1 == 0) return (params.baseFee, params.targetWad);

        weight0Wad = Inventory.weight0(amount0, amount1, sqrtPriceX96);
        fee = FeeCurve.quote(weight0Wad, zeroForOne, params);
    }

    /*
     * @notice Returns the position token amounts and the current pool price
    */
    function inventory() public view returns (uint256 amount0, uint256 amount1, uint160 sqrtPriceX96) {
        if (positionOwner == address(0)) return (0, 0, 0);

        (uint128 positionLiquidity, uint256 growth0Last, uint256 growth1Last) =
            POOL_MANAGER.getPositionInfo(poolId, positionOwner, tickLower, tickUpper, positionSalt);
        if (positionLiquidity == 0) return (0, 0, 0);

        (sqrtPriceX96,,,) = POOL_MANAGER.getSlot0(poolId);
        if (sqrtPriceX96 == 0) return (0, 0, 0);

        (amount0, amount1) = Inventory.amounts(
            positionLiquidity,
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper)
        );
        (uint256 growth0, uint256 growth1) = POOL_MANAGER.getFeeGrowthInside(poolId, tickLower, tickUpper);
        amount0 += Inventory.owed(positionLiquidity, growth0, growth0Last);
        amount1 += Inventory.owed(positionLiquidity, growth1, growth1Last);
    }

    /*
     * @notice Records the pool id when a dynamic fee pool initializes
     * @param key Pool key of the pool being initialized
    */
    function beforeInitialize(address, PoolKey calldata key, uint160) external returns (bytes4) {
        if (msg.sender != address(POOL_MANAGER)) revert NotPoolManager();
        if (!key.fee.isDynamicFee()) revert NotDynamicFee();
        poolId = key.toId();
        return IHooks.beforeInitialize.selector;
    }

    /*
     * @notice Returns the quoted fee for this swap as an override fee
     * @param params Swap parameters from the PoolManager
    */
    function beforeSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata params, bytes calldata)
        external
        view
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        if (msg.sender != address(POOL_MANAGER)) revert NotPoolManager();
        (uint24 fee,) = quoteFee(params.zeroForOne);
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }

    /*
     * @notice Not used by this hook and always reverts
    */
    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure returns (bytes4) {
        revert HookNotEnabled();
    }

    /*
     * @notice Not used by this hook and always reverts
    */
    function beforeAddLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        revert HookNotEnabled();
    }

    /*
     * @notice Not used by this hook and always reverts
    */
    function afterAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure returns (bytes4, BalanceDelta) {
        revert HookNotEnabled();
    }

    /*
     * @notice Not used by this hook and always reverts
    */
    function beforeRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        revert HookNotEnabled();
    }

    /*
     * @notice Not used by this hook and always reverts
    */
    function afterRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure returns (bytes4, BalanceDelta) {
        revert HookNotEnabled();
    }

    /*
     * @notice Not used by this hook and always reverts
    */
    function afterSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata, BalanceDelta, bytes calldata)
        external
        pure
        returns (bytes4, int128)
    {
        revert HookNotEnabled();
    }

    /*
     * @notice Not used by this hook and always reverts
    */
    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        revert HookNotEnabled();
    }

    /*
     * @notice Not used by this hook and always reverts
    */
    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        revert HookNotEnabled();
    }
}
