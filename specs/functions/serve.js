const {initialize, loadEnv} = require('../../dist');
const bfast = require("bfast");

const config = {
    applicationId: 'bfast',
    useLocalIpfs: true,
    projectId: 'bfast',
    port: '3111',
    logs: false,
    web3Token: process.env['WEB_3_TOKEN'],
    adapters: {
        s3Storage: undefined
    },
    masterKey: 'bfast',
    taarifaToken: undefined,
    databaseURI: 'mongodb://localhost/bfast',
    rsaKeyPairInJson: {},
    rsaPublicKeyInJson: {}
}

let myConfig = loadEnv();
myConfig = Object.assign(config, myConfig);
const webService = initialize(myConfig);
bfast.init({
    applicationId: myConfig.applicationId,
    projectId: myConfig.projectId,
    appPassword: myConfig.masterKey,
    databaseURL: `http://localhost:${myConfig.port}`,
    functionsURL: `http://localhost:${myConfig.port}`
});

const storages = webService.storage();

module.exports.fileUploadApi = storages.fileUploadApi;
module.exports.fileListApi = storages.fileListApi;
module.exports.fileThumbnailV2Api = storages.fileThumbnailV2Api;
module.exports.fileThumbnailApi = storages.fileThumbnailApi;
module.exports.fileV2Api = storages.fileV2Api;
module.exports.fileApi = storages.fileApi;
module.exports.getUploadFileV2 = storages.getUploadFileV2;

module.exports.rests = webService.rest().rules;
module.exports.restsjwk = webService.rest().jwk;
module.exports.changes = webService.realtime(myConfig).changes;
