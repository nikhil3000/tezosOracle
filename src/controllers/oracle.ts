import winston from 'winston';
import { EndPointReader } from './endPointReader';
import { ContractHandler } from './contractHandler';
import { sleep } from './utils';

import { Tezos } from '@taquito/taquito';

Tezos.setProvider({ rpc: 'https://testnet-tezos.giganode.io' });

export class Oracle {
    private _taskRunnerTimeout;
    
    constructor(private _oracleConfig,
        private _oracleInterval,
                private bettingPoolContract,
                private _logger: winston.Logger,
                private _endPointReader: EndPointReader,
                private _contractHandler: ContractHandler) {
    }

    run() {
        this._logger.info('Oracle has started');
        this.runTask();
    }

    stop() {
        this._logger.info('Stopping Oracle node');
        clearTimeout(this._taskRunnerTimeout);
    }

    private async runTask() {
        this._logger.info('----- running Oracle task -----');
        for(const config of this._oracleConfig) {
            await this.processConfig(config);
        }
        this._taskRunnerTimeout = setTimeout(()=> { this.runTask();}, this._oracleInterval * 1000);
    }

    private async processConfig(config) {
        // this._logger.info(`Started processing config : ${config.entryPointMichelson}`);
        try {
            const dataMichelson = await this.processEndpoint(config);
            this._logger.info(
                `Finished processing Endpoint : ${JSON.stringify(dataMichelson)}`
            );            
            if (dataMichelson.length == 0)
                    this._logger.info(`Call to contract is not required in this iteration checking back in ${this._oracleInterval} seconds`);
            else
                for (let i = 0; i < dataMichelson.length;i++) {
            // dataMichelson.forEach(async obj => {
                const { entryPoint, address } = dataMichelson[i];
                await this._contractHandler.writeToOracleContract(
                        address,
                        entryPoint.replace(/'/g, '"')
                );
                await sleep(30000);
            };
            // dataMichelson = dataMichelson.replace(/'/g, '"');
            // await this._contractHandler.writeToOracleContract(config.contractAddress, dataMichelson);
        } catch(error) {
            this._logger.error(`Can not process the config : ${config.entryPointMichelson} : ${error}`);
        }
    }

    private async processEndpoint(config): Promise<Record<string, string>[]> {
        const response = await this._endPointReader.fetchDataPoint(config.endPoint);
        const { cycle, height } = response;
        const res = [];
        if (cycle === null || cycle === undefined || height === null || height === undefined) {
            throw Error(`failed to get data for endPoint : ${config.endPoint}`);
        }
        if (2048 - (height % 2048) == 5) {
            // update cycle number
            this._logger.info(`Updating cycle, at block: ${height}`);
            let entryPointMichelson = config.entryPointMichelson;
            entryPointMichelson = this.formatMichelson(
                entryPointMichelson,
                config.field,
                cycle + 1
            );
            res.push({ entryPoint:entryPointMichelson,address:config.contractAddress });
        } else if (2048 - (height % 2048) == 4) {
            this._logger.info(`Creating call for complete bet at block: ${height}`);
            const { entryPointMichelson, contractAddress } = this.bettingPoolContract;
            
            const myContract = await Tezos.contract.at(contractAddress);
            const storage = await myContract.storage();
            // console.log('storage  ', storage);
             for (let i = 1; i <= 3; i++) {
               let finalEntry = entryPointMichelson;
               const temp = storage['betData']
                 .get(`${i * 5}`)
                   .get(`${cycle - i * 5}`);
                //  console.log(temp);
               if (temp) {
                 this._logger.info(
                   `Completing Bet: Type : ${i * 5} BetId : ${
                     cycle - i * 5 
                   }`
                 );
                 finalEntry = this.formatMichelson(
                   finalEntry,
                   'betId',
                   `${cycle - i * 5 }`
                 );
                 finalEntry = this.formatMichelson(
                   finalEntry,
                   'betType',
                   i * 5
                 );
                 res.push({
                   entryPoint: finalEntry,
                   address: contractAddress
                 });
               }
             }
            // await Tezos.contract
            //     .at(contractAddress)
            //     .then((myContract) => {
            //         return myContract.storage();
            //     })
            //     .then((storage) => {
            //         for (let i = 1; i <= 3; i++) {
            //             let finalEntry = entryPointMichelson;
            //             const temp = storage['betData'].get(`${i * 5}`).get(`${cycle - i * 5 - 1}`);
            //             if (temp) {
            //                 this._logger.info(
            //                   `Completing Bet: Type : ${i * 5} BetId : ${
            //                     cycle - i * 5 - 1
            //                   }`
            //                 );
            //                 finalEntry = this.formatMichelson(finalEntry, 'betId', `${cycle - i * 5 - 1}`);
            //                 finalEntry = this.formatMichelson(finalEntry, 'betType', i * 5);
            //                 res.push({ entryPoint: finalEntry ,address:contractAddress, call:true});
            //             }
            //         }
            //     });
        }
        return res;
    }
    
    // private parseResponse(path, response) {
    //     return path.split('.').reduce(function(prev, curr) {
    //         return prev ? prev[curr] : null;
    //     }, response || self);
    // }

    private formatMichelson(entryPointMichelson, nameInEntryPoint, dataToBeAdded): string{
        const parts = entryPointMichelson.split(nameInEntryPoint);
        return parts[0] + dataToBeAdded + parts[1];
    }
}


// config.fields.forEach((field) => {
//     switch (field.type) {
//         case 'fixed':
//             entryPointMichelson = this.formatMichelson(entryPointMichelson, field.nameInEntryPoint, field.data);
//             break;

//         case 'custom':
//             const dataToBeAdded = this.parseResponse(field.path, response);
//             const currentCycle = this.parseResponse('cycle', response);
//             if (dataToBeAdded === null || dataToBeAdded === undefined) {
//                 throw Error(`failed to get data for endPoint : ${config.endPoint}`);
//             }
//             if (2048 - (dataToBeAdded % 2048) == 5) {
//                 // update cycle number
//                 entryPointMichelson = this.formatMichelson(entryPointMichelson, field.nameInEntryPoint, currentCycle + 1);
//             }
//             else if (2048 - (dataToBeAdded % 2048) == 4) {
//                 for (let i = 1; i <= 3; i++) {

//                 }
//                 const bettingPoolContract = this.bettingPoolContract;
//                 entryPointMichelson = this.formatMichelson(bettingPoolContract.entryPointMichelson, bettingPoolContract.field,);

//             }
//             // if(field.isString) {
//             // 	dataToBeAdded = (field.prefix || '') + dataToBeAdded + (field.suffix || '');
//             // 	// entryPointMichelson = this.formatMichelson(entryPointMichelson, field.nameInEntryPoint, dataToBeAdded);
//             // } else {
//             // 	dataToBeAdded *= (field.multiplier || 1);
//             // 	if(field.doFloor) {
//             // 		dataToBeAdded = Math.floor(dataToBeAdded);
//             // 	}
//             // 	if(field.doCeil) {
//             // 		dataToBeAdded = Math.ceil(dataToBeAdded);
//             // 	}
//             // 	// entryPointMichelson = this.formatMichelson(entryPointMichelson, field.nameInEntryPoint, dataToBeAdded);
//             // }
//             break;
//     }
// });