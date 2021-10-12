const {
    BfastDatabaseCore,
    EnvUtil,
    initDatabase,
    getNodes,
    getNode,
    getDataInStore,
    upsertNode,
    upsertDataInStore,
    purgeDataInStore
} = require('../../dist');
const bfast = require("bfast");
const {config} = require("../mock.config");
const envUtil = new EnvUtil();
let myConfig = envUtil.loadEnv();
myConfig = Object.assign(config, myConfig)
const bfd = new BfastDatabaseCore();
const webService = bfd.init(
    initDatabase,
    getNodes,
    getNode,
    getDataInStore,
    upsertNode,
    upsertDataInStore,
    purgeDataInStore,
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
