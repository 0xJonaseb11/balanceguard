// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Hooks} from "v4-core/libraries/Hooks.sol";

library HookMiner {
    error MineFailed();

    uint160 internal constant FLAGS = Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG;

    function mine(address deployer, bytes32 initCodeHash) internal pure returns (address hook, bytes32 salt) {
        for (uint256 i; i < 200_000; ++i) {
            salt = bytes32(i);
            hook = address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, initCodeHash)))));
            if (uint160(hook) & Hooks.ALL_HOOK_MASK == FLAGS) return (hook, salt);
        }
        revert MineFailed();
    }
}
