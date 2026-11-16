// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "solmate/src/tokens/ERC20.sol";

contract GuardToken is ERC20 {
    constructor(string memory tokenName, string memory tokenSymbol, address recipient, uint256 amount)
        ERC20(tokenName, tokenSymbol, 18)
    {
        _mint(recipient, amount);
    }
}
