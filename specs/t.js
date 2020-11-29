const {BFastDatabase} = require('../dist/bfast-database-core');

const bfastDatabase = new BFastDatabase();

bfastDatabase.init({
    port: 3003,
    mongoDbUri: 'mongodb://localhost/test',
    masterKey: 'j',
    applicationId: 'j'
}).then(console.log).catch(console.log);
