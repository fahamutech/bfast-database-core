const {BfastDatabaseCore, EnvUtil} = require('../../dist');
const {bfast} = require("bfastnode");
const envUtil = new EnvUtil();
const config = envUtil.loadEnv();
const bfd = new BfastDatabaseCore();
const webService = bfd.init(config, true);

bfast.init({
    applicationId: config.applicationId,
    projectId: config.projectId,
    appPassword: config.masterKey,
    databaseURL: `http://localhost:${config.port}/v2`
});

module.exports.rests = webService.rest().rules;
module.exports.restsjwk = webService.rest().jwk;
module.exports.changes = webService.realtime(config).changes;
for (const fR of Object.keys(webService.storage())) {
    module.exports[fR] = webService.storage()[fR];
}
