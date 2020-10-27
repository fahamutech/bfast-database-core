import {WebServices} from "./projects/daas/src/lib/webservices/index.webservice";

const {BfastDatabaseCore} = require('./dist/daas/bundles/bfast-database-core.umd');
new BfastDatabaseCore().init({
  masterKey: 'j',
  applicationId: 'j',
  port: 2000,
  mongoDbUri: 'mongodb://localhost/test',
}).then(console.log).catch(console.log)

new WebServices();
