// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {PoolId} from "v4-core/types/PoolId.sol";
import {DeployBalanceGuard} from "../script/Deploy.s.sol";
import {FeeCurve} from "../src/libraries/FeeCurve.sol";
import {GuardToken} from "../src/GuardToken.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";

contract BalanceGuardForkTest is Test {
    uint256 internal constant DEPLOYER_KEY = uint256(keccak256("balanceguard fork deployer"));
    address internal trader = makeAddr("trader");

    DeployBalanceGuard.Deployment internal deployment;

    function setUp() public {
        vm.createSelectFork("https://sepolia.unichain.org");
        deployment = new DeployBalanceGuard().deploy(DEPLOYER_KEY);
    }

    function test_scriptMinesAHookWithTheRightFlags() public view {
        assertEq(uint160(address(deployment.hook)) & Hooks.ALL_HOOK_MASK, HookMiner.FLAGS);
        assertEq(deployment.hook.owner(), vm.addr(DEPLOYER_KEY));
        assertTrue(PoolId.unwrap(deployment.hook.poolId()) != bytes32(0));
    }

    function test_seededPoolStartsBalanced() public view {
        (uint24 worsening, uint256 weight) = deployment.hook.quoteFee(true);
        (uint24 repairing,) = deployment.hook.quoteFee(false);
        assertApproxEqAbs(weight, FeeCurve.WAD / 2, 1e12);
        assertEq(worsening, FeeCurve.BALANCED_GROWTH_BASE_FEE);
        assertEq(repairing, FeeCurve.BALANCED_GROWTH_BASE_FEE);
    }

    function test_traderSwapMovesTheQuote() public {
        GuardToken token0 = GuardToken(Currency.unwrap(deployment.key.currency0));
        GuardToken token1 = GuardToken(Currency.unwrap(deployment.key.currency1));

        vm.startPrank(trader);
        token0.faucet();
        token0.approve(address(deployment.router), type(uint256).max);
        uint256 received = deployment.router.swapExactIn(true, 3 ether, 0);
        vm.stopPrank();

        assertGt(received, 0);
        assertEq(token1.balanceOf(trader), received);
        (uint24 worsening, uint256 weight) = deployment.hook.quoteFee(true);
        (uint24 repairing,) = deployment.hook.quoteFee(false);
        assertGt(weight, FeeCurve.WAD / 2);
        assertGt(worsening, FeeCurve.BALANCED_GROWTH_BASE_FEE);
        assertLt(repairing, FeeCurve.BALANCED_GROWTH_BASE_FEE);
    }
}
