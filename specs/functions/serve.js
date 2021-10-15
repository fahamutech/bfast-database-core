const {initialize, loadEnv} = require('../../dist');
const bfast = require("bfast");
const {config} = require("../mock.config");
let myConfig = loadEnv();
myConfig = Object.assign(config, myConfig)
const webService = initialize(myConfig);
bfast.init({
    applicationId: myConfig.applicationId,
    projectId: myConfig.projectId,
    appPassword: myConfig.masterKey,
    databaseURL: `http://localhost:${myConfig.port}`,
    functionsURL: `http://localhost:${myConfig.port}`
});

module.exports.rests = webService.rest().rules;
module.exports.restsjwk = webService.rest().jwk;
module.exports.changes = webService.realtime(myConfig).changes;
const storages = webService.storage();
for (const fR of Object.keys(storages)) {
    module.exports[fR] = storages[fR];
}
