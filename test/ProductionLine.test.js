const { accounts, contract } = require('@openzeppelin/test-environment');
const { BN, constants ,expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Product = contract.fromArtifact('Product');
const MockProductionLine = contract.fromArtifact('MockProductionLine');

describe('ProductionLine', function () {
    const [ admin, nonAdmin, device1, product1 ] = accounts;

    beforeEach(async function () {
        this.productContract = await Product.new({from: admin});
        this.MockProductionLineContract = await MockProductionLine.new({from: admin});
        this.dummyTaskId = await this.MockProductionLineContract.DUMMY_TASK_ID();
        await this.MockProductionLineContract.setProductContractAddress(this.productContract.address, {from: admin});
    });

    it('should return the address of product contract', async function () {
        const acutalProductContractAddress = await this.MockProductionLineContract.getProductContractAddress();
        expect(acutalProductContractAddress).to.equal(this.productContract.address);
    });

    it('should assign a device to Dummy Task', async function () {
        const receipt = await this.MockProductionLineContract.assignDummyTask(device1, {from: admin});
        expectEvent(receipt, 'TaskAssigned', { device: device1, taskName: 'Dummy Task' });
        const acutalDeviceAssignedToTask1 = await this.MockProductionLineContract.getDeviceAssigned(this.dummyTaskId);
        expect(acutalDeviceAssignedToTask1).to.equal(device1);
    });

    it('should create product', async function () {
        const receipt = await this.MockProductionLineContract.createDummyProduct(product1, {from: admin});
        expectEvent(receipt, 'ProductCreated', { product: product1, creator: admin });
        const currentProductOwner = await this.productContract.ownerOfProduct(product1);
        expect(currentProductOwner).to.equal(this.MockProductionLineContract.address);
    });

    it('should execute Dummy Task', async function () {
        await this.MockProductionLineContract.assignDummyTask(device1, {from: admin});
        await this.MockProductionLineContract.createDummyProduct(product1, {from: admin});
        await this.MockProductionLineContract.executeDummyTask(product1, {from: admin});
        const currentApprovedDevice = await this.productContract.getApprovedDevice(product1);
        expect(currentApprovedDevice).to.equal(device1);
    });

    it('should confirm Dummy Task', async function () {
        await this.MockProductionLineContract.assignDummyTask(device1, {from: admin});
        await this.MockProductionLineContract.createDummyProduct(product1, {from: admin});
        await this.MockProductionLineContract.executeDummyTask(product1, {from: admin});
        await this.MockProductionLineContract.confirmDummyTask(product1, {from: device1});
        const currentApprovedDevice = await this.productContract.getApprovedDevice(product1);
        expect(currentApprovedDevice).to.equal(constants.ZERO_ADDRESS);
    });
})