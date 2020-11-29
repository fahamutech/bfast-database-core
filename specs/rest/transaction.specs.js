const axios = require('axios');
const {serverUrl} = require('../mock.config');
const {
    before,
    after,
    it,
    describe
} = require('mocha');
const assert = require('assert');

describe('Transaction', function () {
    before(async function () {
    });
    after(async function () {

    });

    it('should be able to perform transaction anonymously', async function () {
        const transaction = {
            applicationId: 'daas',
            CreateTest: {
                id: 'ethan',
                // // age: 20,
                // // // year: 2020,
                // // // message: 'hello, world!',
                // // return: ['createdAt']
            },
            DeleteTest: {
                id: 'ethan'
            },
            Transaction: {
                commit: {
                    CreateTest: {
                        id: 'joshua',
                        age: 16,
                        year: 2020,
                        message: 'hello, josh!',
                        return: []
                    },
                    // CreateLog: {
                    //     id: 'log234',
                    //     age: 23,
                    //     return: ['createdAt']
                    // },
                    // CreatePayment: {
                    //     id: 'pay234',
                    //     amount: 100,
                    //     return: ['createdAt']
                    // },
                    QueryTest: {
                        id: 'joshua',
                        return: ['age']
                    }
                }
            }
        }
        const transactionResponse = await axios.post(serverUrl, transaction);
        console.log(transactionResponse.data);
    });
});
