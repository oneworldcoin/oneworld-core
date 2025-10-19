// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OneW is ERC20Capped, Ownable {
    constructor(uint256 cap_) ERC20("One World Coin", "ONEW") ERC20Capped(cap_) {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
