const {getEnv} = require("../dist");
const mongodb = require("mongodb");
const axios = require("axios");
const {expect} = require("chai");


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

module.exports.serverUrl = 'http://localhost:3111/v2';
module.exports.mongoRepSet = mongoMemoryReplSet;

module.exports.config = {
    applicationId: 'bfast_test',
    useLocalIpfs: true,
    projectId: 'bfast_test',
    port: '3111',
    logs: false,
    web3Token: getEnv(process.env['WEB_3_TOKEN']),
    adapters: {
        s3Storage: undefined
    },
    masterKey: 'bfast_test',
    taarifaToken: undefined,
    databaseURI: 'mongodb://localhost/_test',
    rsaKeyPairInJson: {},
    rsaPublicKeyInJson: {}
}

module.exports.sendRuleRequest = async function sendRequest(data, code = 200) {
    const response = await axios.post(exports.serverUrl, data);
    expect(response.status).equal(code);
    return response.data;
}
