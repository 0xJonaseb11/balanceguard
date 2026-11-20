// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {Deployers} from "v4-core-test/utils/Deployers.sol";
import {BalanceGuardHook} from "../src/BalanceGuardHook.sol";
import {FeeCurve} from "../src/libraries/FeeCurve.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";
import {Inventory} from "../src/libraries/Inventory.sol";
import {SafeCast} from "v4-core/libraries/SafeCast.sol";

contract BalanceGuardHookTest is Deployers {
    using StateLibrary for IPoolManager;

    BalanceGuardHook internal hook;

    function setUp() public {
        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        bytes memory args = abi.encode(manager, address(this));
        bytes32 initCodeHash = keccak256(abi.encodePacked(type(BalanceGuardHook).creationCode, args));
        (address predicted, bytes32 salt) = HookMiner.mine(address(this), initCodeHash);
        hook = new BalanceGuardHook{salt: salt}(IPoolManager(manager), address(this));
        assertEq(address(hook), predicted);

        (key,) = initPoolAndAddLiquidity(
            currency0, currency1, IHooks(address(hook)), LPFeeLibrary.DYNAMIC_FEE_FLAG, SQRT_PRICE_1_1
        );
    }

    function test_staticFeePoolReverts() public {
        PoolKey memory staticKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });
        (bool ok, bytes memory reason) =
            address(manager).call(abi.encodeCall(manager.initialize, (staticKey, SQRT_PRICE_1_1)));
        assertFalse(ok);
        assertTrue(_contains(reason, BalanceGuardHook.NotDynamicFee.selector));
    }

    function test_strangerCannotRetune() public {
        vm.expectRevert(BalanceGuardHook.NotOwner.selector);
        vm.prank(address(1));
        hook.setPaused(true);
    }

    function test_pausedSwapUsesBaseFee() public {
        _trackHeavyPosition();
        hook.setPaused(true);
        BalanceDelta delta = swap(key, true, -1e15, ZERO_BYTES);
        assertApproxEqAbs(_out(delta), (1e15 * 997_000) / 1_000_000, 1e12);
    }

    function test_tokenHeavyPositionChargesTheCap() public {
        _trackHeavyPosition();
        (uint24 fee, uint256 weight) = hook.quoteFee(true);
        assertEq(weight, FeeCurve.WAD);
        assertEq(fee, FeeCurve.BALANCED_GROWTH_MAX_FEE);

        BalanceDelta delta = swap(key, true, -1e15, ZERO_BYTES);
        assertApproxEqAbs(_out(delta), (1e15 * 995_000) / 1_000_000, 1e12);
    }

    function test_repairingSideGetsTheFloor() public {
        _trackHeavyPosition();
        (uint24 fee,) = hook.quoteFee(false);
        assertEq(fee, FeeCurve.BALANCED_GROWTH_MIN_FEE);
    }

    function test_uncollectedFeesEnterTheWeight() public {
        hook.setPosition(address(modifyLiquidityRouter), -120, 120, bytes32(0));
        swap(key, true, -1e16, ZERO_BYTES);

        (uint128 positionLiquidity, uint256 growth0Last, uint256 growth1Last) =
            manager.getPositionInfo(key.toId(), address(modifyLiquidityRouter), -120, 120, bytes32(0));
        (uint256 growth0, uint256 growth1) = manager.getFeeGrowthInside(key.toId(), -120, 120);
        uint256 fees0 = Inventory.owed(positionLiquidity, growth0, growth0Last);
        uint256 fees1 = Inventory.owed(positionLiquidity, growth1, growth1Last);
        assertGt(fees0, 0);

        (uint160 sqrtPriceX96,,,) = manager.getSlot0(key.toId());
        (uint256 amount0, uint256 amount1) = Inventory.amounts(
            positionLiquidity,
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(-120),
            TickMath.getSqrtPriceAtTick(120)
        );
        uint256 fullWeight = Inventory.weight0(amount0 + fees0, amount1 + fees1, sqrtPriceX96);
        (, uint256 quoted) = hook.quoteFee(true);
        assertEq(quoted, fullWeight);

        (uint256 held0, uint256 held1, uint160 heldPrice) = hook.inventory();
        assertEq(held0, amount0 + fees0);
        assertEq(held1, amount1 + fees1);
        assertEq(heldPrice, sqrtPriceX96);
    }

    function test_untrackedPositionReportsEmptyInventory() public view {
        (uint256 amount0, uint256 amount1, uint160 sqrtPriceX96) = hook.inventory();
        assertEq(amount0, 0);
        assertEq(amount1, 0);
        assertEq(sqrtPriceX96, 0);
        (uint24 fee, uint256 weight) = hook.quoteFee(true);
        assertEq(fee, FeeCurve.BALANCED_GROWTH_BASE_FEE);
        assertEq(weight, FeeCurve.BALANCED_GROWTH_TARGET_WAD);
    }

    function test_directCallbackReverts() public {
        vm.expectRevert(BalanceGuardHook.NotPoolManager.selector);
        hook.beforeInitialize(address(this), key, SQRT_PRICE_1_1);
    }

    function _trackHeavyPosition() private {
        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({tickLower: 600, tickUpper: 1200, liquidityDelta: 1e18, salt: 0}),
            ZERO_BYTES
        );
        hook.setPosition(address(modifyLiquidityRouter), 600, 1200, bytes32(0));
    }

    function _out(BalanceDelta delta) private pure returns (uint256) {
        int128 amount1 = delta.amount1();
        if (amount1 < 0) amount1 = -amount1;
        return SafeCast.toUint128(amount1);
    }

    function _contains(bytes memory reason, bytes4 selector) private pure returns (bool) {
        if (reason.length < 4) return false;
        for (uint256 i; i + 4 <= reason.length; ++i) {
            bytes4 next;
            assembly {
                next := mload(add(add(reason, 32), i))
            }
            if (next == selector) return true;
        }
        return false;
    }
}
