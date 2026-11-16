// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {BalanceGuardHook} from "../src/BalanceGuardHook.sol";
import {GuardToken} from "../src/GuardToken.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";
import {PoolSeed} from "../src/PoolSeed.sol";

contract DeployBalanceGuard is Script {
    address internal constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    uint256 internal constant FUND = 10 ether;

    function run() external returns (BalanceGuardHook hook, PoolSeed seed, PoolKey memory key) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);
        IPoolManager manager = IPoolManager(POOL_MANAGER);
        bytes memory args = abi.encode(manager, deployer);
        bytes32 initCodeHash = keccak256(abi.encodePacked(type(BalanceGuardHook).creationCode, args));
        (address predicted, bytes32 salt) = HookMiner.mine(deployer, initCodeHash);

        vm.startBroadcast(privateKey);
        hook = new BalanceGuardHook{salt: salt}(manager, deployer);
        seed = new PoolSeed(manager);
        GuardToken tokenA = new GuardToken("Guard Token A", "GTA", deployer, FUND);
        GuardToken tokenB = new GuardToken("Guard Token B", "GTB", deployer, FUND);
        (Currency currency0, Currency currency1) = _sort(address(tokenA), address(tokenB));
        GuardToken(Currency.unwrap(currency0)).approve(address(seed), FUND);
        GuardToken(Currency.unwrap(currency1)).approve(address(seed), FUND);
        key = PoolKey(currency0, currency1, LPFeeLibrary.DYNAMIC_FEE_FLAG, 60, IHooks(address(hook)));
        seed.open(
            key,
            TickMath.getSqrtPriceAtTick(0),
            IPoolManager.ModifyLiquidityParams({tickLower: -600, tickUpper: 600, liquidityDelta: 1e18, salt: 0}),
            FUND,
            FUND
        );
        hook.setPosition(address(seed), -600, 600, bytes32(0));
        vm.stopBroadcast();

        if (address(hook) != predicted) revert HookMiner.MineFailed();
    }

    function _sort(address tokenA, address tokenB) private pure returns (Currency currency0, Currency currency1) {
        if (tokenA < tokenB) return (Currency.wrap(tokenA), Currency.wrap(tokenB));
        return (Currency.wrap(tokenB), Currency.wrap(tokenA));
    }
}
