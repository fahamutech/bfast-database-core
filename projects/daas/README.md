# BFast Database Core
BFast Database Core Libs

## Get Started

Include in your nodejs project by install it as a dependency `npm install bfast-database-core` after install add all peer dependencies that libs will ask.

## Initiate a libraries

You need to run initiation before use the library in order for it to set up necessary configurations.

```javascript

const {BfastDatabaseCore} = require('bfast-database-core');

const bfastDatabase = new BfastDatabaseCore();

bfastDatabase.init({
    masterKey: 'any-string-you-want',
    applicationId: 'any-string-you-want',
    mongoDbUri: 'mongodb://localhost/test', // your mongodb server url
}).then(console.log).catch(console.log);

```

