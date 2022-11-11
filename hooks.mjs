import {start} from "bfast-function";

import {dirname} from 'path';
import {fileURLToPath} from 'url';

const config = {
    applicationId: 'bfast',
    useLocalIpfs: true,
    projectId: 'bfast',
    port: '3111',
    logs: false,
    web3Token: process.env['WEB_3_TOKEN'],
    adapters: {s3Storage: undefined},
    masterKey: 'bfast',
    taarifaToken: undefined,
    databaseURI: 'mongodb://localhost/bfast',
    rsaKeyPairInJson: {},
    rsaPublicKeyInJson: {}
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export const mochaHooks = {
    async beforeAll() {
        process.env.APPLICATION_ID = config.applicationId;
        process.env.PROJECT_ID = config.projectId;
        process.env.MASTER_KEY = config.masterKey;
        process.env.PORT = config.port.toString();
        process.env.DATABASE_URI = config.databaseURI;
        process.env.TAARIFA_TOKEN = config.taarifaToken;
        process.env.RSA_PUBLIC_KEY = JSON.stringify(config.rsaPublicKeyInJson);
        process.env.RSA_KEY = JSON.stringify(config.rsaKeyPairInJson);
        process.env.USE_LOCAL_IPFS = 'true';
        console.log('________START__________');
        // await start({
        //     port: config.port,
        //     functionsConfig: {
        //         functionsDirPath: __dirname + '/specs/functions',
        //         bfastJsonPath: __dirname + '/specs/bfast.json'
        //     }
        // }).catch(console.log);
    },
    async afterAll() {
        console.log('________END__________');
    }
};

