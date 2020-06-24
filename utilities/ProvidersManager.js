require('dotenv').config();
const HDWalletProvider = require("@truffle/hdwallet-provider");
const config = require('../truffle-config');
const contract = require('@truffle/contract');

module.exports = {
    getProvider: function(networkName){
        switch(networkName) {
            case 'dev_gui':
                return new HDWalletProvider(process.env.DEV_MNEMONIC, `http://${config.networks.dev_gui.host}:${config.networks.dev_gui.port}`);
            case 'dev_cli':
                return new HDWalletProvider(process.env.DEV_MNEMONIC, `http://${config.networks.dev_cli.host}:${config.networks.dev_cli.port}`);
            case 'rinkeby':
               return config.networks.rinkeby.provider();
            }
    }
}