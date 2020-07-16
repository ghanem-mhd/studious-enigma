require('dotenv').config()

var Web3                = require('web3')
var ContractsManager    = require('./contracts-manager')
var ProvidersManager    = require('./providers-manager')
var KeyManager          = require('./keys-manager')
var Logger              = require('./logger')

module.exports = {
    seedEntities:async function(networkName){
        Logger.info('Seeding entities')
        var provider = ProvidersManager.getHttpProvider(networkName, process.env.ADMIN_MNEMONIC)
        try{
            var web3 = new Web3(provider)

            var adminAddress = KeyManager.getAddressFromMnemonic(process.env.ADMIN_MNEMONIC)
            var customerAddress = KeyManager.getAddressFromMnemonic(process.env.CUSTOMER_MNEMONIC)
            var supplierAddress = KeyManager.getAddressFromMnemonic(process.env.SUPPLIER_MNEMONIC)
            var manufacturerAddress = KeyManager.getAddressFromMnemonic(process.env.MANUFACTURER_MNEMONIC)

            var entitiesInstance = await ContractsManager.getTruffleContract(networkName, 'Entities', process.env.ADMIN_MNEMONIC)

            var receipt;
            receipt = await entitiesInstance.addEntity(customerAddress, "Customer 1", {from:adminAddress})
            Logger.logTx('Adding entity Customer 1',receipt)

            receipt = await entitiesInstance.addEntity(supplierAddress, "Supplier 1", {from:adminAddress})
            Logger.logTx('Adding entity Supplier 1', receipt)

            receipt = await entitiesInstance.addEntity(manufacturerAddress, "Manufacturer 1", {from:adminAddress})
            Logger.logTx('Adding entity Manufacturer 1', receipt)

            receipt = await web3.eth.sendTransaction({from:adminAddress, to:customerAddress, value:web3.utils.toWei("10","ether")})
            Logger.logTx('Sending ether to ' + customerAddress, receipt)

            receipt = await web3.eth.sendTransaction({from:adminAddress, to:supplierAddress, value:web3.utils.toWei("10","ether")})
            Logger.logTx('Sending ether to ' + supplierAddress, receipt)

            receipt = await web3.eth.sendTransaction({from:adminAddress, to:manufacturerAddress, value:web3.utils.toWei("10","ether")})
            Logger.logTx('Sending ether to ' + manufacturerAddress, receipt)

            var machine1Id = KeyManager.getAddress('m1')
            receipt = await web3.eth.sendTransaction({from:adminAddress, to:machine1Id, value:web3.utils.toWei("10","ether")})
            Logger.logTx('Sending ether to ' + machine1Id, receipt)
        } catch(err){
            Logger.error(err.message)
        }finally{
            provider.engine.stop()
        }
    },
    seedRoles: async function(networkName){
        Logger.info('Seeding roles')
        var provider = ProvidersManager.getHttpProvider(networkName, process.env.ADMIN_MNEMONIC)
        try{
            var adminAddress = KeyManager.getAddressFromMnemonic(process.env.ADMIN_MNEMONIC)

            var roleManagerInstance = await ContractsManager.getTruffleContract(networkName, 'RoleManager', process.env.ADMIN_MNEMONIC)

            var receipt;

            var CUSTOMER_ROLE = await roleManagerInstance.CUSTOMER_ROLE()
            var customerAddress =KeyManager.getAddressFromMnemonic(process.env.CUSTOMER_MNEMONIC)
            receipt = await roleManagerInstance.grantRole(CUSTOMER_ROLE, customerAddress, {from:adminAddress})
            Logger.logTx('Grant CUSTOMER_ROLE to ' + customerAddress, receipt)

            var SUPPLIER_ROLE = await roleManagerInstance.SUPPLIER_ROLE()
            var supplierAddress = KeyManager.getAddressFromMnemonic(process.env.SUPPLIER_MNEMONIC)
            receipt = await roleManagerInstance.grantRole(SUPPLIER_ROLE, supplierAddress, {from:adminAddress})
            Logger.logTx('Grant SUPPLIER_ROLE to ' + supplierAddress, receipt)

            var MANUFACTURER_ROLE = await roleManagerInstance.MANUFACTURER_ROLE()
            var manufacturerAddress = KeyManager.getAddressFromMnemonic(process.env.MANUFACTURER_MNEMONIC)
            receipt = await roleManagerInstance.grantRole(MANUFACTURER_ROLE, manufacturerAddress, {from:adminAddress})
            Logger.logTx('Grant MANUFACTURER_ROLE to ' + manufacturerAddress, receipt)
        } catch(err){
            Logger.error(err.message)
        }finally{
            provider.engine.stop()
        }
    },
    seedDevices: async function(networkName){
        Logger.info('Seeding devices')
        var provider = ProvidersManager.getHttpProvider(networkName, process.env.MANUFACTURER_MNEMONIC)
        try{
            var manufacturerAddress = KeyManager.getAddressFromMnemonic(process.env.MANUFACTURER_MNEMONIC)
            var devicesInstance = await ContractsManager.getTruffleContract(networkName, 'Devices', process.env.MANUFACTURER_MNEMONIC)

            var receipt;

            var machine1Id = KeyManager.getAddress('m1')
            var machine2Id = KeyManager.getAddress('m2')

            receipt = await devicesInstance.addDevice(machine1Id, 'Machine 1', {from:manufacturerAddress})
            Logger.logTx('Adding machine ' + machine1Id, receipt)

            receipt = await devicesInstance.addDevice(machine2Id, 'Machine 2', {from:manufacturerAddress})
            Logger.logTx('Adding machine ' + machine2Id, receipt)
            
        } catch(err){
            Logger.error(err)
        }finally{
            provider.engine.stop()
        }
    },
    seedProductionPipeline: async function(networkName){
        Logger.info('Seeding pipeline')
        var provider = ProvidersManager.getHttpProvider(networkName, process.env.ADMIN_MNEMONIC)
        try{
            var adminAddress = KeyManager.getAddressFromMnemonic(process.env.ADMIN_MNEMONIC)
            var productContract = await  ContractsManager.getTruffleContract(networkName, 'Product', process.env.ADMIN_MNEMONIC)
            var productionLine = await ContractsManager.getTruffleContract(networkName, 'DemoProductionLine', process.env.ADMIN_MNEMONIC)

            var device1 = KeyManager.getAddress('m1')

            var receipt;

            var task = await productionLine.WAREHOUSE_TASK();
            receipt = await productionLine.setProductContractAddress(productContract.address, {from: adminAddress});
            Logger.logTx('Setting product contract address', receipt)

            receipt = await productionLine.assignWarehouseTask(device1, {from: adminAddress});
            Logger.logTx('Assign warehouse task to device ' + device1, receipt)


            receipt = await productionLine.createDemoProduct(device1, 'Red' , {from: adminAddress});
            Logger.logTx('Creating a demo product', receipt)

        } catch(err){
            Logger.error(err.stack)
        }finally{
            provider.engine.stop()
        }
    },
    sendFund: async function(networkName, address, fund){
        Logger.info('Seeding fund')
        var provider = ProvidersManager.getHttpProvider(networkName, process.env.ADMIN_MNEMONIC)
        try{
            var web3 = new Web3(provider)
            var adminAddress = KeyManager.getAddressFromMnemonic(process.env.ADMIN_MNEMONIC)
            receipt = await web3.eth.sendTransaction({from:adminAddress, to:address, value:web3.utils.toWei(fund,"ether")})
            Logger.logTx(`Sending ${fund} ether to ` + address, receipt)
        } catch(err){
            Logger.error(err.message)
        }finally{
            provider.engine.stop()
        }
    },
    seed:function(networkName){
        module.exports.seedEntities(networkName).then( ()=> {
            module.exports.seedRoles(networkName).then( () => {
                module.exports.seedDevices(networkName).then( () => {
                    module.exports.seedProductionPipeline(networkName);
                });
            })
        })
    },
}

for (var i=0; i<process.argv.length;i++) {
    switch (process.argv[i]) {
        case 'seed-all':
            module.exports.seed(process.argv[i+1])
        break;
        case 'seed':
            module.exports.seedProductionPipeline(process.argv[i+1])
        break;
        case 'fund':
            module.exports.sendFund(process.argv[i+1], process.argv[i+2], process.argv[i+3])
        break;
    }
}