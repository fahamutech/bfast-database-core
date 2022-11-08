import {DatabaseAdapter, getEnv} from "./index";
import {MongoDatabaseFactory} from "./factories/mongo-database";
import axios from "axios";

export const databaseFactory = (): DatabaseAdapter => {
    return new MongoDatabaseFactory()
}

export const serverUrl = 'http://localhost:3111/v2';

export const config = {
    applicationId: 'bfast',
    useLocalIpfs: 'localhost',
    projectId: 'bfast',
    port: '3111',
    logs: false,
    web3Token: getEnv(process.env['WEB_3_TOKEN']),
    adapters: {s3Storage: undefined},
    masterKey: 'bfast',
    taarifaToken: undefined,
    databaseURI: 'mongodb://localhost/bfast',
    rsaKeyPairInJson: {},
    rsaPublicKeyInJson: {}
}

export const sendRuleRequest = async function sendRequest(data, code = 200) {
    const response = await axios.post(exports.serverUrl, data);
    if (response.status !== code) {
        throw {message: 'status code not equal'}
    }
    return response.data;
}
