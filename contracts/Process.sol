// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <0.7.0;

import "./Machine.sol";
import "./Registry.sol";
import "./Product.sol";
import "../contracts/setTypes/UintSet.sol";
import "../contracts/setTypes/AddressSet.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract Process is Ownable {

    using UintSet for UintSet.Set;
    using Counters for Counters.Counter;
    using AddressSet for AddressSet.Set;

    constructor(address _processOwner, address _productContractAddress, address _regsitryContractAddress) public {
        processOwner = _processOwner;
        productContract = Product(_productContractAddress);
        registryContact = Registry(_regsitryContractAddress);
        registryContact.registerProcess(getName(), address(this));
    }

    address public processOwner;

    modifier onlyProcessOwner(){
        require(_msgSender() == processOwner, "Only process owner can call this function.");
        _;
    }

    modifier processInstanceExists(uint processID){
        require(processID != 0 && processesCounter.current() >= processID, "Process doesn't exists.");
        _;
    }

    modifier machineExists(uint machineNumber){
        require(1 <= machineNumber &&  machineNumber <= getNumberOfMachines(), "Unknown Machine Number.");
        _;
    }

    function getProcessOwner() public view returns(address) {
        return processOwner;
    }

    enum ProcessStatus { Started, FinishedSuccessfully, FinishedUnsuccessfully, Killed }

    struct ProcessInstance{
        address productDID;
        uint startingTime;
        uint finishingTime;
        ProcessStatus status;
        int currentStep;
    }
    mapping (uint => ProcessInstance) private instances;

    Counters.Counter private processesCounter;
    mapping (address => uint256) private productProcessMapping;
    Product productContract;
    Registry registryContact;


    function startProcess(address productDID) public returns(uint256) {
        productContract.authorizeProcess(address(this), productDID);
        processesCounter.increment();
        uint processID = processesCounter.current();

        productProcessMapping[productDID] = processID;
        ProcessInstance storage instance = instances[processID];
        instance.startingTime = now;
        instance.productDID = productDID;
        instance.status = ProcessStatus.Started;
        instance.currentStep = 0;

        emit ProcessStarted(processID, productDID);

        return processID;
    }

    function markStepAsStarted(uint processID, int nextStep) public processInstanceExists(processID) onlyProcessOwner() {
        address productDID  = getProductDID(processID);
        int currentStep = instances[processID].currentStep;
        require(currentStep == nextStep - 1, "Step can't be started in wrong order.");
        instances[processID].currentStep = nextStep;
        emit ProcessStepStarted(processID, productDID, nextStep);
    }

    function finishProcess(uint processID, ProcessStatus status) public processInstanceExists(processID) onlyProcessOwner() {
        require(instances[processID].finishingTime == 0, "Process already finished.");
        instances[processID].finishingTime = now;
        instances[processID].status = status;
        emit ProcessFinished(processID, instances[processID].productDID);
    }

    function killProcess(uint processID) public processInstanceExists(processID) onlyProcessOwner() {
        require(instances[processID].finishingTime == 0, "Process already finished.");
        instances[processID].finishingTime = now;
        instances[processID].status = ProcessStatus.Killed;
        emit ProcessKilled(processID, instances[processID].productDID);
    }

    function getProcessInstance(uint processID) public view processInstanceExists(processID) returns (address, uint, uint, ProcessStatus, int) {
        return (instances[processID].productDID,
            instances[processID].startingTime,
            instances[processID].finishingTime,
            instances[processID].status,
            instances[processID].currentStep
        );
    }

    function getProcessID(address productDID) public view returns (uint256) {
        require(productProcessMapping[productDID] != 0, "No process for the given product.");
        return productProcessMapping[productDID];
    }

    function getProductDID(uint256 processID) public view processInstanceExists(processID) returns (address) {
        return instances[processID].productDID;
    }

    function getProcessesCount() public view returns (uint256) {
        return processesCounter.current();
    }

    function authorizeMachine(uint machineNumber, uint processID) public   {
        address productDID  = getProductDID(processID);
        productContract.authorizeMachine(getMachineAddress(machineNumber), productDID);
    }

    function unauthorizeCurrentMachine(uint processID) public {
        address productDID  = getProductDID(processID);
        productContract.unauthorizeCurrentMachine(productDID);
    }

    mapping(uint => Machine) machines;

    function setMachineAddress(uint machineNumber, address machineContractAddress) public machineExists(machineNumber)  {
        machines[machineNumber] = Machine(machineContractAddress);
    }

    function getMachineAddress(uint machineNumber) public machineExists(machineNumber) view returns (address) {
        return address(machines[machineNumber]);
    }

    function getMachineDID(uint machineNumber) public view returns (address) {
        return machines[machineNumber].getMachineDID();
    }

    function assignTask(uint machineNumber, uint processID, uint taskType) public {
        address productDID  = getProductDID(processID);
        machines[machineNumber].assignTask(processID, productDID, taskType);
    }

    function getStepInfo(uint stepNumber) public view returns(string memory, string memory) {
        uint taskType = getStepTaskType(stepNumber);
        string memory taskName = machines[getMachineNumber(stepNumber)].getTaskTypeName(taskType);
        string memory machineSymbol = machines[getMachineNumber(stepNumber)].getSymbol();
        return (machineSymbol, taskName);
    }

    event ProcessStepStarted(uint indexed processID, address indexed productDID, int step);
    event ProcessStarted(uint indexed processID, address indexed productDID);
    event ProcessFinished(uint indexed processID, address indexed productDID);
    event ProcessKilled(uint indexed processID, address indexed productDID);

    function getNumberOfMachines() public virtual pure returns(uint);
    function getNumberOfSteps() public virtual pure returns(uint);
    function getStepTaskType(uint stepNumber) public virtual pure returns(uint);
    function getMachineNumber(uint stepNumber) public virtual pure returns(uint);
    function getSymbol() public virtual pure returns (string memory);
    function getName() public virtual pure returns (string memory);
}