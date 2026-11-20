// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {Deployers} from "v4-core-test/utils/Deployers.sol";
import {BalanceGuardHook} from "../src/BalanceGuardHook.sol";
import {GuardRouter} from "../src/GuardRouter.sol";
import {GuardToken} from "../src/GuardToken.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";

contract GuardRouterTest is Deployers {
    GuardRouter internal router;
    address internal trader = makeAddr("trader");

    function setUp() public {
        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        bytes memory args = abi.encode(manager, address(this));
        bytes32 initCodeHash = keccak256(abi.encodePacked(type(BalanceGuardHook).creationCode, args));
        (, bytes32 salt) = HookMiner.mine(address(this), initCodeHash);
        BalanceGuardHook hook = new BalanceGuardHook{salt: salt}(IPoolManager(manager), address(this));

        (key,) = initPoolAndAddLiquidity(
            currency0, currency1, IHooks(address(hook)), LPFeeLibrary.DYNAMIC_FEE_FLAG, SQRT_PRICE_1_1
        );
        router = new GuardRouter(manager, key);

        _token(currency0).transfer(trader, 10 ether);
        _token(currency1).transfer(trader, 10 ether);
        vm.startPrank(trader);
        _token(currency0).approve(address(router), type(uint256).max);
        _token(currency1).approve(address(router), type(uint256).max);
        vm.stopPrank();
    }

    function test_swapZeroForOnePaysInputAndSendsOutput() public {
        vm.prank(trader);
        uint256 received = router.swapExactIn(true, 1e15, 0);

        assertEq(_token(currency0).balanceOf(trader), 10 ether - 1e15);
        assertEq(_token(currency1).balanceOf(trader), 10 ether + received);
        assertApproxEqAbs(received, (1e15 * 997_000) / 1_000_000, 1e12);
    }

    function test_swapOneForZeroPaysInputAndSendsOutput() public {
        vm.prank(trader);
        uint256 received = router.swapExactIn(false, 1e15, 0);

        assertEq(_token(currency1).balanceOf(trader), 10 ether - 1e15);
        assertEq(_token(currency0).balanceOf(trader), 10 ether + received);
    }

    function test_minimumOutputReverts() public {
        vm.prank(trader);
        vm.expectRevert();
        router.swapExactIn(true, 1e15, 1e15);
    }

    function test_zeroAmountReverts() public {
        vm.prank(trader);
        vm.expectRevert(GuardRouter.ZeroAmount.selector);
        router.swapExactIn(true, 0, 0);
    }

    function test_directCallbackReverts() public {
        vm.expectRevert(GuardRouter.NotPoolManager.selector);
        router.unlockCallback(abi.encode(trader, true, uint128(1)));
    }

    function test_faucetMintsTheFixedAmount() public {
        GuardToken token = new GuardToken("Guard Token A", "GTA", address(this), 0);
        vm.prank(trader);
        token.faucet();
        assertEq(token.balanceOf(trader), token.FAUCET_AMOUNT());
    }

    function _token(Currency currency) private pure returns (MockERC20) {
        return MockERC20(Currency.unwrap(currency));
    }
}
