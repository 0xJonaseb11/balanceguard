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

contract BalanceGuardHook is IHooks {
    using LPFeeLibrary for uint24;
    using StateLibrary for IPoolManager;

    IPoolManager public immutable poolManager;
    address public owner;
    FeeCurve.Params public strategy;
    int24 public tickLower;
    int24 public tickUpper;
    uint128 public liquidity;
    bool public paused;
    PoolId public poolId;

    error NotPoolManager();
    error NotOwner();
    error NotDynamicFee();
    error InvalidPosition();
    error HookNotEnabled();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(IPoolManager manager, address initialOwner) {
        poolManager = manager;
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

    function setStrategy(FeeCurve.Params calldata nextStrategy) external onlyOwner {
        FeeCurve.validate(nextStrategy);
        strategy = nextStrategy;
    }

    function setPosition(int24 lower, int24 upper, uint128 nextLiquidity) external onlyOwner {
        if (lower >= upper || lower < TickMath.MIN_TICK || upper > TickMath.MAX_TICK) revert InvalidPosition();
        tickLower = lower;
        tickUpper = upper;
        liquidity = nextLiquidity;
    }

    function setPaused(bool nextPaused) external onlyOwner {
        paused = nextPaused;
    }

    function quoteFee(bool zeroForOne) public view returns (uint24 fee, uint256 weight0Wad) {
        if (paused || liquidity == 0) return (strategy.baseFee, strategy.targetWad);

        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        if (sqrtPriceX96 == 0) return (strategy.baseFee, strategy.targetWad);

        (uint256 amount0, uint256 amount1) = Inventory.amounts(
            liquidity, sqrtPriceX96, TickMath.getSqrtPriceAtTick(tickLower), TickMath.getSqrtPriceAtTick(tickUpper)
        );
        if (amount0 == 0 && amount1 == 0) return (strategy.baseFee, strategy.targetWad);

        weight0Wad = Inventory.weight0(amount0, amount1, sqrtPriceX96);
        fee = FeeCurve.quote(weight0Wad, zeroForOne, strategy);
    }

    function beforeInitialize(address, PoolKey calldata key, uint160) external returns (bytes4) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        if (!key.fee.isDynamicFee()) revert NotDynamicFee();
        poolId = key.toId();
        return IHooks.beforeInitialize.selector;
    }

    function beforeSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata params, bytes calldata)
        external
        view
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        (uint24 fee,) = quoteFee(params.zeroForOne);
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }

    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure returns (bytes4) {
        revert HookNotEnabled();
    }

    function beforeAddLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        revert HookNotEnabled();
    }

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

    function beforeRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        revert HookNotEnabled();
    }

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

    function afterSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata, BalanceDelta, bytes calldata)
        external
        pure
        returns (bytes4, int128)
    {
        revert HookNotEnabled();
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        revert HookNotEnabled();
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        revert HookNotEnabled();
    }
}
