## Get stated
This repository use mongodb as a database engine so you need to have it localy
even though it spin its own in memory latest mongodb when run test ( test for ubuntu & debian OS & Chrome OS ). In  chrome os you need to install mongodb in your machine and update this file [config-mock](src/test.ts). That file contain more configuration for tests.

NOTE: Your mongo instance must be in Replica mode fot transactions and stream changes tests to work.

## Contribute

1. Clone repository
2. run `yarn install`
3. run `yarn test` to runn all tests
4. Add new features write its test and run `yarn test` or `npx mocha specs/<path-to-your-test-file>`

mocha --require ts-node/register --extensions ts,tsx --watch --watch-files src 'tests/**/*.{ts,tsx}' [...args]
Or specify options via your mocha config file.
{
// Specify "require" for CommonJS
"require": "ts-node/register",
// Specify "loader" for native ESM
"loader": "ts-node/esm",
"extensions": ["ts", "tsx"],
"spec": [
"tests/**/*.spec.*"
],
"watch-files": [
"src"
]
}