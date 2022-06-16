// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/proxy/Clones.sol";

contract ParfaitProxyFactory {
    address public implementationContract;

    address[] public allClones;

    event NewClone(address _clone);

    constructor(address _implementation) {
        implementationContract = _implementation;
    }

    function createNewProxy(
        uint _xAllocation,
        uint _yAllocation,
        uint _zAllocation
    ) external payable returns (address instance) {
        instance = Clones.clone(implementationContract);
        instance.call{value: msg.value}(
            abi.encodeWithSignature(
                "initialize(address,uint256,uint256,uint256)",
                msg.sender,
                _xAllocation,
                _yAllocation,
                _zAllocation
            )
        );

        allClones.push(instance);
        emit NewClone(instance);
        return instance;
    }
}
