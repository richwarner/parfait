//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract Parfait is Initializable {
	address public owner;
	uint public xAllocation;
	uint public yAllocation;
    uint public zAllocation;
	uint public xBalance;
	uint public yBalance;
    uint public zBalance;

	function initialize(address _owner, uint _xAllocation, uint _yAllocation, uint _zAllocation) public payable initializer {
		owner = _owner;
		xAllocation = _xAllocation;
		yAllocation = _yAllocation;
        yAllocation = _zAllocation;
	}

	function rebalance() public {
		require(msg.sender == owner, "only owner can call this");
        //replace below with proper rebalance
		uint totalAllocation = xAllocation + yAllocation + zAllocation;
        xBalance += 10 * xAllocation / totalAllocation;
		yBalance += 10 * yAllocation / totalAllocation;
        zBalance += 10 * zAllocation / totalAllocation;
	}
    function updateAllocations(uint _xAllocation, uint _yAllocation, uint _zAllocation) external {
        require(msg.sender == owner, "only owner can call this");
        require(_xAllocation + _yAllocation + _zAllocation == 100, "invalid allocations sum");
        xAllocation = _xAllocation;
		yAllocation = _yAllocation;
        yAllocation = _zAllocation;
        rebalance();
    }
}