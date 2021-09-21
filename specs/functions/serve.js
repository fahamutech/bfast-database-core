const {BfastDatabaseCore, EnvUtil} = require('../../dist');
const bfast = require("bfast");
const {config} = require("../mock.config");
const envUtil = new EnvUtil();
let myConfig = envUtil.loadEnv();
myConfig = Object.assign(config, myConfig)
const bfd = new BfastDatabaseCore();
const webService = bfd.init(myConfig);
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
module.exports.syncs = webService.realtime(myConfig).syncs;
for (const fR of Object.keys(webService.storage())) {
    module.exports[fR] = webService.storage()[fR];
}
