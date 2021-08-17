const {BfastDatabaseCore, EnvUtil} = require('../../dist');
const {bfast} = require("bfastnode");
const {config} = require("../mock.config");
const envUtil = new EnvUtil();
let myConfig = envUtil.loadEnv();
myConfig = Object.assign(myConfig, config)
const bfd = new BfastDatabaseCore();
const webService = bfd.init(myConfig, true);

bfast.init({
    applicationId: myConfig.applicationId,
    projectId: myConfig.projectId,
    appPassword: myConfig.masterKey,
    databaseURL: `http://localhost:${myConfig.port}/v2`
});

module.exports.rests = webService.rest().rules;
module.exports.restsjwk = webService.rest().jwk;
module.exports.changes = webService.realtime(myConfig).changes;
for (const fR of Object.keys(webService.storage())) {
    module.exports[fR] = webService.storage()[fR];
}
