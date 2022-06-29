// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "hardhat/console.sol";

contract ParfaitProxyFactory {
    address public implementationContract;

    address[] public allClones;

    event NewClone(address _owner, address _clone);

    constructor(address _implementation) {
        implementationContract = _implementation;
    }

    function createNewProxy(
        int _xAllocation,
        int _yAllocation,
        int _zAllocation
    ) external payable returns (address instance) {
        instance = Clones.clone(implementationContract);
        console.log("value: ");
        console.log(msg.value);
        (bool success, ) = instance.call{value: msg.value}(
            abi.encodeWithSignature(
                "initialize(address,int256,int256,int256)",
                msg.sender,
                _xAllocation,
                _yAllocation,
                _zAllocation
            )
        );
        require(success, "Proxy Initialization Failed");
        allClones.push(instance);
        emit NewClone(msg.sender, instance);
        return instance;
    }
}
