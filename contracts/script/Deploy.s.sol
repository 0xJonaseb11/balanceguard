// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {BalanceGuardHook} from "../src/BalanceGuardHook.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";

contract DeployBalanceGuard is Script {
    address internal constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;

    function run() external returns (BalanceGuardHook hook) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);
        bytes memory args = abi.encode(POOL_MANAGER, deployer);
        bytes32 initCodeHash = keccak256(abi.encodePacked(type(BalanceGuardHook).creationCode, args));
        (address predicted, bytes32 salt) = HookMiner.mine(deployer, initCodeHash);

        vm.startBroadcast(privateKey);
        hook = new BalanceGuardHook{salt: salt}(IPoolManager(POOL_MANAGER), deployer);
        vm.stopBroadcast();

        if (address(hook) != predicted) revert HookMiner.MineFailed();
    }
}
