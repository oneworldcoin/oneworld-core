// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardsVault is Ownable {
    IERC20 public token;
    address public beneficiary;
    uint256 public allocated;
    uint256 public startTime;
    uint256 public duration;
    uint256 public released;

    constructor(
        address _token,
        address _beneficiary,
        uint256 _allocated,
        uint256 _startTime,
        uint256 _duration
    ) Ownable() {
        token = IERC20(_token);
        beneficiary = _beneficiary;
        allocated = _allocated;
        startTime = _startTime;
        duration = _duration;
    }

    function release() external {
        require(block.timestamp >= startTime, "Vault: not started");
        uint256 vested = vestedAmount();
        uint256 unreleased = vested - released;
        require(unreleased > 0, "Vault: nothing to release");
        released += unreleased;
        token.transfer(beneficiary, unreleased);
    }

    function vestedAmount() public view returns (uint256) {
        if (block.timestamp < startTime) return 0;
        uint256 elapsed = block.timestamp - startTime;
        if (elapsed >= duration) return allocated;
        return (allocated * elapsed) / duration;
    }
}
