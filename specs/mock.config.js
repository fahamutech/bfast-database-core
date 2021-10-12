const {BfastDatabaseCore} = require("../dist/index");
const {EnvUtil} = require('../dist/index')
const mongodb = require('mongodb');
const axios = require("axios");
const {expect} = require('chai');

const mongoMemoryReplSet = () => {
    return {
        getUri: function () {
            return 'mongodb://localhost/_test';
        },
        start: async function () {
            const conn = await mongodb.MongoClient.connect(this.getUri());
            await conn.db('_test').dropDatabase();
        },
        stop: async function () {
        }
    }
}

/**
 * @return {Promise<BfastDatabaseCore>}
 */
const daas = async () => {
    return new BfastDatabaseCore();
}

exports.serverUrl = 'http://localhost:3111/v2';
exports.mongoRepSet = mongoMemoryReplSet;
exports.daas = daas;
exports.config = {
    applicationId: 'bfast_test',
    projectId: 'bfast_test',
    port: '3111',
    logs: false,
    web3Token: new EnvUtil().getEnv(process.env['WEB_3_TOKEN']),
    adapters: {
        s3Storage: undefined
    },
    masterKey: 'bfast_test',
    taarifaToken: undefined,
    mongoDbUri: 'mongodb://localhost/_test',
    rsaKeyPairInJson: {},
    rsaPublicKeyInJson: {}
}

exports.sendRuleRequest = async function sendRequest(data, code = 200) {
    const response = await axios.post(exports.serverUrl, data);
    expect(response.status).equal(code);
    return response.data;
}
