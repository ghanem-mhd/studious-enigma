// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <0.7.0;

import "./Machine.sol";

contract MockMachine is Machine {

    constructor(address _machineOwner, address _machineID, address _productContractAddress) Machine(_machineOwner, _machineID, _productContractAddress) public {}

    function createTaskWithProduct(address productID, string memory taskName) public {
        super.createTask(productID, taskName);
    }

    function createTaskWithoutProduct(string memory taskName) public {
        uint newTaskID = super.createTask(address(0), taskName);
        super.saveTaskParam(newTaskID, "taskInput", "1");
        super.startTask(newTaskID);
    }

    function saveMockReading(uint taskID, ReadingType readingType, int readingValue) public {
        uint readingID = super.saveReading(taskID, readingType, readingValue);

        if (readingType == ReadingType.Temperature && readingValue > 40) {
            super.saveIssue(readingID, "critical temperature threshold exceeded", IssueType.Critical);
        }
    }
}