const { accounts, contract } = require('@openzeppelin/test-environment');
const { BN, constants ,expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const web3 = require('web3');

const Product = contract.fromArtifact('Product');
const MockProductionLine = contract.fromArtifact('MockProductionLine');

describe('ProductionLine', function () {
    const [ admin, nonAdmin, machine1, product1 ] = accounts;

    beforeEach(async function () {
        this.productContract = await Product.new({from: admin});
        this.MockProductionLineContract = await MockProductionLine.new({from: admin});
        this.dummyTaskType = await this.MockProductionLineContract.DUMMY_TASK_TYPE();
        await this.MockProductionLineContract.setProductContractAddress(this.productContract.address, {from: admin});
    });

    it('should return the address of product contract', async function () {
        const acutalProductContractAddress = await this.MockProductionLineContract.getProductContractAddress();
        expect(acutalProductContractAddress).to.equal(this.productContract.address);
    });

    it('should assign a machine to Dummy Task type', async function () {
        const receipt = await this.MockProductionLineContract.assignDummyTask(machine1, {from: admin});
        expectEvent(receipt, 'TaskTypeAssigned', { machine: machine1, taskType: this.dummyTaskType, status: true });
        const acutalMachineAssignedToTask = await this.MockProductionLineContract.getMachineAssigned(this.dummyTaskType);
        expect(acutalMachineAssignedToTask).to.equal(machine1);
    });

    it('should create product', async function () {
        await this.MockProductionLineContract.assignDummyTask(machine1, {from: admin});
        var receipt = await this.MockProductionLineContract.createDummyProduct(product1, {from: admin});
        expectEvent(receipt, 'ProductCreated', { product: product1, creator: admin });
        const currentProductOwner = await this.productContract.ownerOfProduct(product1);
        expect(currentProductOwner).to.equal(this.MockProductionLineContract.address);
        receipt = await this.MockProductionLineContract.getTasksCount();
        expect(receipt.toString()).to.equal("1");
    });

    it('should start Dummy Task', async function () {
        await this.MockProductionLineContract.assignDummyTask(machine1, {from: admin});
        await this.MockProductionLineContract.createDummyProduct(product1, {from: admin});
        var receipt = await this.MockProductionLineContract.startDummyTask(product1, {from: admin});
        expectEvent(receipt, 'NewTask', { machine: machine1, product: product1, taskId: "2" });
        const currentApprovedMachine = await this.productContract.getApprovedMachine(product1);
        expect(currentApprovedMachine).to.equal(machine1);
    });

    it('should finish Dummy Task', async function () {
        await this.MockProductionLineContract.assignDummyTask(machine1, {from: admin});
        await this.MockProductionLineContract.createDummyProduct(product1, {from: admin});
        await this.MockProductionLineContract.finishDummyTask(product1, 1, {from: machine1});
        const currentApprovedMachine = await this.productContract.getApprovedMachine(product1);
        expect(currentApprovedMachine).to.equal(constants.ZERO_ADDRESS);
    });

    it('should get correct params', async function () {
        await this.MockProductionLineContract.assignDummyTask(machine1, {from: admin});
        await this.MockProductionLineContract.createDummyProduct(product1, {from: admin});
        await this.MockProductionLineContract.finishDummyTask(product1, 1, {from: machine1});

        var receipt = await this.MockProductionLineContract.getTask(1, {from: machine1});

        //'0x636f6c6f72000000000000000000000000000000000000000000000000000000'
        var param1Name = web3.utils.padRight(web3.utils.asciiToHex("color"), 64)
        // '0x73697a6500000000000000000000000000000000000000000000000000000000'
        var param2Name = web3.utils.padRight(web3.utils.asciiToHex("size"), 64)

        expect(receipt[0]).to.equal(machine1);
        expect(receipt[1]).to.equal(product1);
        expect(receipt[2]).to.equal(this.dummyTaskType);
        expect(receipt[6]).to.deep.equal([param1Name, param2Name ]);

        var receipt = await this.MockProductionLineContract.getTaskParameter(1, param1Name, {from: machine1});
        expect(receipt).to.equal("Red");
        receipt = await this.MockProductionLineContract.getTaskParameter(1,param2Name, {from: machine1});
        expect(receipt).to.equal("Big");
    });

    it('should revert if the task is already finished', async function () {
        await this.MockProductionLineContract.assignDummyTask(machine1, {from: admin});
        await this.MockProductionLineContract.createDummyProduct(product1, {from: admin});
        await this.MockProductionLineContract.startDummyTask(product1, {from: admin});
        var receipt = await this.MockProductionLineContract.isTaskFinished(1, {from: machine1});
        expect(receipt).to.equal(false);
        await this.MockProductionLineContract.finishDummyTask(product1, 1, {from: machine1});
        receipt = await this.MockProductionLineContract.isTaskFinished(1, {from: machine1});
        expect(receipt).to.equal(true);
        receipt = this.MockProductionLineContract.finishDummyTask(product1, 1, {from: machine1});
        expectRevert(receipt, "Task already finished.")
    });

    it('should get all tasks types', async function () {
        var receipt = await this.MockProductionLineContract.getTasksTypes();
        expect(receipt[0]).to.equal(this.dummyTaskType);
    });

    it('should get the name of the task', async function () {
        var receipt = await this.MockProductionLineContract.getTaskName(this.dummyTaskType);
        expect(receipt).to.equal('0x44756d6d79205461736b00000000000000000000000000000000000000000000');
    });

    it('should get the number of tasks', async function () {
        var receipt = await this.MockProductionLineContract.getTasksCount();
        expect(receipt.toString()).to.equal("0");
    });

})