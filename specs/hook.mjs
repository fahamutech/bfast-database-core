import {start} from "bfast-function";
import {config} from './mock.config.mjs';
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
        // process.env.LOGS = '0';
        console.log('________  START__________');
        // const r = require('./functions/serve');
        // console.log(r);
        // ySocketServer = await startYJsWebsocketServer();
        await start({
            port: config.port,
            functionsConfig: {
                functionsDirPath: __dirname + '/functions',
                bfastJsonPath: __dirname + '/bfast.json'
            }
        }).catch(console.log);
    },
    async afterAll() {
        console.log('________END__________');
        // process.kill(ySocketServer.pid);
        // await bfastFs.stop();
    }
};
