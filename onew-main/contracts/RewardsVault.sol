// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OneW.sol";

contract RewardsVault {
    OneW public token;
    address public beneficiary;
    uint256 public totalAllocated;
    uint256 public released;
    uint256 public start;
    uint256 public duration;

    constructor(address token_, address beneficiary_, uint256 allocated_, uint256 start_, uint256 duration_) {
        token = OneW(token_);
        beneficiary = beneficiary_;
        totalAllocated = allocated_;
        start = start_;
        duration = duration_;
    }

    function release() public {
        require(block.timestamp >= start, "Not started yet");
        uint256 elapsed = block.timestamp - start;
        uint256 releasable = (totalAllocated * elapsed) / duration;
        uint256 amount = releasable - released;
        require(amount > 0, "Nothing to release");

        released += amount;
        token.mint(beneficiary, amount);
    }
}
