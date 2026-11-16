// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {PoolId} from "v4-core/types/PoolId.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {BalanceGuardHook} from "../src/BalanceGuardHook.sol";
import {GuardToken} from "../src/GuardToken.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";
import {PoolSeed} from "../src/PoolSeed.sol";

contract BalanceGuardForkTest is Test {
    address internal constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    uint256 internal constant FUND = 10 ether;

    function setUp() public {
        vm.createSelectFork("https://sepolia.unichain.org");
    }

    function test_seededPoolQuotesOnTheLiveManager() public {
        IPoolManager manager = IPoolManager(POOL_MANAGER);
        assertGt(POOL_MANAGER.code.length, 0);

        bytes memory args = abi.encode(manager, address(this));
        bytes32 initCodeHash = keccak256(abi.encodePacked(type(BalanceGuardHook).creationCode, args));
        (address predicted, bytes32 salt) = HookMiner.mine(address(this), initCodeHash);
        BalanceGuardHook hook = new BalanceGuardHook{salt: salt}(manager, address(this));
        assertEq(address(hook), predicted);

        PoolSeed seed = new PoolSeed(manager);
        GuardToken tokenA = new GuardToken("Guard Token A", "GTA", address(this), FUND);
        GuardToken tokenB = new GuardToken("Guard Token B", "GTB", address(this), FUND);
        (Currency currency0, Currency currency1) = _sort(address(tokenA), address(tokenB));
        GuardToken(Currency.unwrap(currency0)).approve(address(seed), FUND);
        GuardToken(Currency.unwrap(currency1)).approve(address(seed), FUND);

        PoolKey memory key = PoolKey(currency0, currency1, LPFeeLibrary.DYNAMIC_FEE_FLAG, 60, IHooks(address(hook)));
        seed.open(
            key,
            TickMath.getSqrtPriceAtTick(0),
            IPoolManager.ModifyLiquidityParams({tickLower: -600, tickUpper: 600, liquidityDelta: 1e18, salt: 0}),
            FUND,
            FUND
        );
        hook.setPosition(address(seed), -600, 600, bytes32(0));

        assertTrue(PoolId.unwrap(hook.poolId()) != bytes32(0));
        (uint24 fee, uint256 weight) = hook.quoteFee(true);
        assertGt(weight, 0);
        assertGt(fee, 0);
        assertLt(fee, LPFeeLibrary.DYNAMIC_FEE_FLAG);
    }

    function _sort(address tokenA, address tokenB) private pure returns (Currency currency0, Currency currency1) {
        if (tokenA < tokenB) return (Currency.wrap(tokenA), Currency.wrap(tokenB));
        return (Currency.wrap(tokenB), Currency.wrap(tokenA));
    }
}
