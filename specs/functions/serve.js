const {
    initDatabase,
    getNodes,
    getNode,
    getDataInStore,
    upsertNode,
    upsertDataInStore,
    initialize,
    purgeNode,
    loadEnv
} = require('../../dist');
const bfast = require("bfast");
const {config} = require("../mock.config");
let myConfig = loadEnv();
myConfig = Object.assign(config, myConfig)
console.log(myConfig);
const webService = initialize(
    initDatabase,
    getNodes,
    getNode,
    getDataInStore,
    upsertNode,
    upsertDataInStore,
    purgeNode,
    myConfig
);
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
for (const fR of Object.keys(webService.storage())) {
    module.exports[fR] = webService.storage()[fR];
}
