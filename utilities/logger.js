require("dotenv").config()

const winston = require('winston');

const logger = winston.createLogger({

    transports: [
        new winston.transports.File({
            level: 'verbose',
            format: winston.format.combine(
                winston.format.prettyPrint()
              ),
            filename: 'logs/verbose.log',
            options: { flags: 'w' }
        }),
        new winston.transports.Console({
            level    : 'info',
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ],
});

logger.logTx = function(desc, receipt){
    // + ": " + receipt.transactionHash
    if(receipt.hasOwnProperty('transactionHash')){
        logger.info(desc )
    }
    // + ": " + receipt.tx
    if(receipt.hasOwnProperty('tx')){
        logger.info(desc)
    }
    logger.verbose({desc,receipt})
}


logger.ClientLog = function(clientName, description, receipt) {
    var logMessage = {
        clientName: clientName,
        description: description,
        receipt: receipt,
        transactionHash: null,
        timestamp: new Date().toLocaleString(),
    }
    if (receipt){
        if(receipt.hasOwnProperty('transactionHash')){
            logger.info(`${clientName} - ${description} : ${receipt.transactionHash}`)
            logMessage.transactionHash = receipt.transactionHash
        }
        if(receipt.hasOwnProperty('tx')){
            logger.info(`${clientName} - ${description} : ${receipt.tx}`)
            logMessage.transactionHash = receipt.tx
        }
        logger.verbose(logMessage)
    }else {
        logger.info(`${clientName} - ${description}`);
    }
}

module.exports=logger;