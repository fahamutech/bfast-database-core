// import {WebServices,} from "./projects/daas/src/lib/webservices/index.webservice";

const {BfastDatabaseCore, WebServices, Provider} = require('./dist/daas/bundles/bfast-database-core.umd');
new BfastDatabaseCore().init({
  masterKey: 'j',
  applicationId: 'j',
  port: 2000,
  mongoDbUri: 'mongodb://localhost/test',
}).then(console.log).catch(console.log)

console.log(new WebServices(
  Provider.get(Provider.names.REST_WEB_SERVICE),
  Provider.get(Provider.names.REALTIME_WEB_SERVICE),
  Provider.get(Provider.names.STORAGE_WEB_SERVICE),
).storage().fileV1Api);
// console.log(Provider.get('StorageController'));
