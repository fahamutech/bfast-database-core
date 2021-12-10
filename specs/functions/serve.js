const {initialize, loadEnv} = require('../../dist');
const bfast = require("bfast");
const {config} = require("../mock.config.js");
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
