import {getEnv} from "./src";
import mongodb from "mongodb";
import axios from "axios";
import {expect} from "chai";


const mongoMemoryReplSet = () => {
    return {
        getUri: function () {
            return 'mongodb://localhost/bfast';
        },
        start: async function () {
            const conn = await mongodb.MongoClient.connect(this.getUri());
            await conn.db('bfast').dropDatabase();
        },
        stop: async function () {
        }
    }
}

export const serverUrl = 'http://localhost:3111/v2';
export const mongoRepSet = mongoMemoryReplSet;

export const config = {
    applicationId: 'bfast',
    useLocalIpfs: true,
    projectId: 'bfast',
    port: '3111',
    logs: false,
    web3Token: getEnv(process.env['WEB_3_TOKEN']),
    adapters: {
        s3Storage: undefined
    },
    masterKey: 'bfast',
    taarifaToken: undefined,
    databaseURI: 'mongodb://localhost/bfast',
    rsaKeyPairInJson: {},
    rsaPublicKeyInJson: {}
}

export const sendRuleRequest = async function sendRequest(data, code = 200) {
    const response = await axios.post(exports.serverUrl, data);
    expect(response.status).equal(code);
    return response.data;
}