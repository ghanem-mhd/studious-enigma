// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <0.7.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/EnumerableMap.sol";
import "../contracts/setTypes/UintSet.sol";

contract Product is Ownable {

    using UintSet for UintSet.Set;
    using Counters for Counters.Counter;
    using EnumerableMap for EnumerableMap.UintToAddressMap;

    Counters.Counter private productsCount;
    mapping (string => address) private productPhysicalIDMapping;

    struct Operation{
        address machineDID;
        uint taskID;
        uint time;
        string name;
        string result;
    }
    Counters.Counter private operationsCounter;
    UintSet.Set private operationsIds;

    mapping (address => address) private productsOwners;
    mapping (address => address) private productsAuthorizedManufacturers;
    mapping (address => address) private productsAuthorizedMachines;

    mapping (uint => Operation) private operations;
    mapping (address => uint[]) private productsOperations;
    mapping (address => mapping (string => uint)) productsOperationsNames;


    // Modifiers
    modifier productExists(address productDID){
        require(productsOwners[productDID] != address(0), "Product doesn't exist.");
        _;
    }

    modifier onlyProductOwner(address productDID){
        require(productsOwners[productDID] != address(0) &&
        (tx.origin == productsOwners[productDID]),
        "Only product owner can call this function.");
        _;
    }

    modifier onlyAuthorizeManufacturerOrOwner(address productDID){
        require( (tx.origin == productsOwners[productDID]) ||
        (productsAuthorizedManufacturers[productDID] != address(0) && (tx.origin == productsAuthorizedManufacturers[productDID])),
        "Only authorize manufacturer can call this function.");
        _;
    }

    modifier onlyAuthorizeMachine(address productDID){
        require(productsAuthorizedMachines[productDID] != address(0) &&
        (tx.origin == productsAuthorizedMachines[productDID]),
        "Only authorize machine can call this function.");
        _;
    }

    function createProduct(address productDID) public {
        require(productsOwners[productDID] == address(0), "Product already exist.");
        productsOwners[productDID] = _msgSender();
        productsCount.increment();
    }

    function ownerOfProduct(address productDID) public productExists(productDID) view returns (address){
        return productsOwners[productDID];
    }

    function authorizeManufacturer(address manufacturerDID, address productDID) public productExists(productDID) onlyProductOwner(productDID)  {
        productsAuthorizedManufacturers[productDID] = manufacturerDID;
    }

    function unauthorizeCurrentManufacturer(address productDID) public productExists(productDID) onlyProductOwner(productDID) {
        productsAuthorizedManufacturers[productDID] = address(0);
    }

    function getAuthorizeManufacturer(address productDID) public productExists(productDID) view returns(address){
        return productsAuthorizedManufacturers[productDID];
    }

    function authorizeMachine(address machineDID, address productDID) public productExists(productDID) onlyAuthorizeManufacturerOrOwner(productDID)  {
        productsAuthorizedMachines[productDID] = machineDID;
    }

    function unauthorizeCurrentMachine(address productDID) public productExists(productDID) onlyAuthorizeManufacturerOrOwner(productDID) {
        productsAuthorizedMachines[productDID] = address(0);
    }

    function getAuthorizedMachine(address productDID) public productExists(productDID) view returns(address){
        return productsAuthorizedMachines[productDID];
    }

    function getProductsCount() public view returns(uint){
        return productsCount.current();
    }

    function saveProductOperation(address productDID, uint taskID, string memory name, string memory result) productExists(productDID) onlyAuthorizeMachine(productDID) public returns (uint){
        operationsCounter.increment();
        uint opeationID = operationsCounter.current();
        operationsIds.insert(opeationID);
        Operation storage operation = operations[opeationID];
        operation.time              = now;
        operation.machineDID        = _msgSender();
        operation.taskID            = taskID;
        operation.name              = name;
        operation.result            = result;
        productsOperations[productDID].push(opeationID);
        productsOperationsNames[productDID][name] = opeationID;
        return opeationID;
    }

    function getProductOperation(uint opeationID) public view returns (address, uint, uint, string memory, string memory) {
        require(operationsIds.exists(opeationID), "Operation doesn't exist.");
        return (
            operations[opeationID].machineDID,
            operations[opeationID].taskID,
            operations[opeationID].time,
            operations[opeationID].name,
            operations[opeationID].result
        );
    }

    function getProductOperations(address productDID) public productExists(productDID) view returns(uint [] memory) {
        return (productsOperations[productDID]);
    }

    function saveIdentificationOperation(address productDID, uint taskID, string memory physicalID) public productExists(productDID)  {
        saveProductOperation(productDID, taskID, "Physical Identification", physicalID);
        productPhysicalIDMapping[physicalID] = productDID;
    }

    function getProductFromPhysicalID(string memory physicalID) public view returns (address) {
        return productPhysicalIDMapping[physicalID];
    }

    function getProductOperationResult(address productDID, string memory operationName) public productExists(productDID) view returns (string memory) {
        require(productsOperationsNames[productDID][operationName] != 0, "Operation doesn't exists.");
        uint operationID = productsOperationsNames[productDID][operationName];
        ( , , , , string memory result) = getProductOperation(operationID);
        return result;
    }
}