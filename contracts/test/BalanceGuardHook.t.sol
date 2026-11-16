// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {Deployers} from "v4-core-test/utils/Deployers.sol";
import {BalanceGuardHook} from "../src/BalanceGuardHook.sol";
import {FeeCurve} from "../src/libraries/FeeCurve.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";

contract BalanceGuardHookTest is Deployers {
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
        PoolKey memory staticKey = PoolKey(currency0, currency1, 3000, 60, IHooks(address(hook)));
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
        hook.setPosition(-600, 600, 1e18);
        hook.setPaused(true);
        BalanceDelta delta = swap(key, true, -1e15, ZERO_BYTES);
        assertApproxEqAbs(_out(delta), (1e15 * 997_000) / 1_000_000, 1e12);
    }

    function test_tokenHeavyPositionChargesTheCap() public {
        hook.setPosition(600, 1200, 1e18);
        (uint24 fee, uint256 weight) = hook.quoteFee(true);
        assertEq(weight, FeeCurve.WAD);
        assertEq(fee, FeeCurve.BALANCED_GROWTH_MAX_FEE);

        BalanceDelta delta = swap(key, true, -1e15, ZERO_BYTES);
        assertApproxEqAbs(_out(delta), (1e15 * 995_000) / 1_000_000, 1e12);
    }

    function test_repairingSideGetsTheFloor() public {
        hook.setPosition(600, 1200, 1e18);
        (uint24 fee,) = hook.quoteFee(false);
        assertEq(fee, FeeCurve.BALANCED_GROWTH_MIN_FEE);
    }

    function test_directCallbackReverts() public {
        vm.expectRevert(BalanceGuardHook.NotPoolManager.selector);
        hook.beforeInitialize(address(this), key, SQRT_PRICE_1_1);
    }

    function _out(BalanceDelta delta) private pure returns (uint256) {
        int128 amount1 = delta.amount1();
        if (amount1 < 0) amount1 = -amount1;
        return uint256(uint128(amount1));
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
