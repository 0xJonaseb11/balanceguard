// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "solmate/src/tokens/ERC20.sol";

/*
 * @title GuardToken
 * @author 0xJonaseb11
 * @notice Test ERC20 with a public faucet
*/
contract GuardToken is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 100 ether;

    constructor(string memory tokenName, string memory tokenSymbol, address recipient, uint256 amount)
        ERC20(tokenName, tokenSymbol, 18)
    {
        _mint(recipient, amount);
    }

    /*
     * @notice Mints 100 test tokens to the caller
    */
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
