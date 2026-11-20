// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {BalanceGuardHook} from "../src/BalanceGuardHook.sol";
import {GuardRouter} from "../src/GuardRouter.sol";
import {GuardToken} from "../src/GuardToken.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";
import {PoolSeed} from "../src/PoolSeed.sol";

/*
 * @title DeployBalanceGuard
 * @author 0xJonaseb11
 * @notice Deploys the hook, tokens, pool, and router
*/
contract DeployBalanceGuard is Script {
    address internal constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    uint256 internal constant SEED_FUND = 1_000 ether;
    uint128 internal constant SEED_LIQUIDITY = 1_000 ether;
    int24 internal constant SEED_RANGE = 600;
    int24 internal constant TICK_SPACING = 60;

    struct Deployment {
        BalanceGuardHook hook;
        GuardRouter router;
        PoolSeed seed;
        PoolKey key;
    }

    /*
     * @notice Deploys with PRIVATE_KEY and logs the contract addresses
    */
    function run() external returns (Deployment memory deployment) {
        deployment = deploy(vm.envUint("PRIVATE_KEY"));
        console2.log("hook", address(deployment.hook));
        console2.log("router", address(deployment.router));
        console2.log("token0", Currency.unwrap(deployment.key.currency0));
        console2.log("token1", Currency.unwrap(deployment.key.currency1));
    }

    /*
     * @notice Deploys and wires the hook, pool, position, and router
     * @param privateKey Private key of the deployer
    */
    function deploy(uint256 privateKey) public returns (Deployment memory deployment) {
        address deployer = vm.addr(privateKey);
        IPoolManager manager = IPoolManager(POOL_MANAGER);

        vm.startBroadcast(privateKey);
        deployment.hook = _deployHook(manager, deployer);
        deployment.seed = new PoolSeed(manager);
        deployment.key = _openPool(deployment.seed, deployment.hook, deployer);
        deployment.hook.setPosition(address(deployment.seed), -SEED_RANGE, SEED_RANGE, bytes32(0));
        deployment.router = new GuardRouter(manager, deployment.key);
        vm.stopBroadcast();
    }

    /*
     * @notice Mines a salt and deploys the hook at the matching address
     * @param manager PoolManager the hook serves
     * @param owner Address that owns the hook
    */
    function _deployHook(IPoolManager manager, address owner) private returns (BalanceGuardHook hook) {
        bytes memory args = abi.encode(manager, owner);
        bytes32 initCodeHash = keccak256(abi.encodePacked(type(BalanceGuardHook).creationCode, args));
        (address predicted, bytes32 salt) = HookMiner.mine(CREATE2_FACTORY, initCodeHash);
        hook = new BalanceGuardHook{salt: salt}(manager, owner);
        if (address(hook) != predicted) revert HookMiner.MineFailed();
    }

    /*
     * @notice Deploys the test tokens and opens the seeded dynamic fee pool
     * @param seed Seed contract that opens the pool
     * @param hook Hook the pool uses
     * @param deployer Address that funds the test tokens
    */
    function _openPool(PoolSeed seed, BalanceGuardHook hook, address deployer) private returns (PoolKey memory key) {
        GuardToken tokenA = new GuardToken("Guard Token A", "GTA", deployer, SEED_FUND);
        GuardToken tokenB = new GuardToken("Guard Token B", "GTB", deployer, SEED_FUND);
        tokenA.approve(address(seed), SEED_FUND);
        tokenB.approve(address(seed), SEED_FUND);

        (Currency currency0, Currency currency1) = _sort(address(tokenA), address(tokenB));
        key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(hook))
        });
        seed.open(
            key,
            TickMath.getSqrtPriceAtTick(0),
            IPoolManager.ModifyLiquidityParams({
                tickLower: -SEED_RANGE,
                tickUpper: SEED_RANGE,
                liquidityDelta: int256(uint256(SEED_LIQUIDITY)),
                salt: bytes32(0)
            })
        );
    }

    /*
     * @notice Orders two token addresses as currency0 and currency1
     * @param tokenA First token address
     * @param tokenB Second token address
    */
    function _sort(address tokenA, address tokenB) private pure returns (Currency currency0, Currency currency1) {
        if (tokenA < tokenB) return (Currency.wrap(tokenA), Currency.wrap(tokenB));
        return (Currency.wrap(tokenB), Currency.wrap(tokenA));
    }
}
