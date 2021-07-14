
const { LogController } = require("../dist/controllers/log.controller");
const { BfastDatabaseCore } = require("../dist/bfast-database-core");
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { RulesController } = require('../dist/controllers/rules.controller');
const { UpdateRuleController } = require('../dist/controllers/update.rule.controller');
const mongodb = require('mongodb');

/**
 *
 * @return {MongoMemoryServer}
 */
// const mongoServer = () => {
//     return new MongoMemoryServer({
//         autoStart: false,
//         replSet: { storageEngine: 'wiredTiger' },
//     });
// }

/**
 *
 * @return {MongoMemoryReplSet | MongoMemoryServer}
 */
const mongoMemoryReplSet = () => {
    if (process.env.CHROME_OS === 'ndio') {
        return {
            getUri: function () {
                return 'mongodb://localhost/_test?replicaSet=bfast';
            },
            start: async function () {
                const conn = await mongodb.MongoClient.connect(this.getUri());
                // const db = await conn.db();
                await conn.db().dropDatabase(); 
                console.log('***START MONGODB*****');
            },
            waitUntilRunning: async function () {
            },
            stop: async function(){
                console.log('***STOP MONGODB*****');
            }
        }
    } else {
        return new MongoMemoryReplSet({
            autoStart: true,
            replSet: {
                count: 3,
                storageEngine: "wiredTiger",
            }
        });
    }
}

/**
 * @return {Promise<BfastDatabaseCore>}
 */
const daas = async () => {
    return new BfastDatabaseCore();
}

exports.serverUrl = 'http://localhost:3111/';
// exports.mongoServer = mongoServer;
exports.mongoRepSet = mongoMemoryReplSet;
exports.daas = daas;
exports.config = {
    applicationId: 'daas',
    port: 3111,
    logs: false,
    adapters: {},
    mountPath: '/',
    masterKey: 'daas',
    mongoDbUri: 'mongodb://localhost/test',
    rsaKeyPairInJson: {
        "p": "_09LOKJdsMbbJBD-NckTpyer4Hh2D5tz7RJwDsbHAt2zjmQWeAfIA2DVZY-ftwWMA3C77yf0huM5xVfU6DsJL72WtdCCCPggyfKkMuMYfch-MFV6imt6-Fwm9gAH_-BuuToabwjBHGehV_I-Jy0D_wWdIc5hTIGZtDj5rg0cQ8k",
        "kty": "RSA",
        "q": "u6PsWuYbu9r-MpKbQyjfQIEb6hhoBAa7mZJNflMLV0fa0mNUnGOYybjwLOZUqpG5eX2XdfUkndlttZmqHMqU02p8K9qonwVzAGVVjdpVw0RPBky6TrAvAcIG8TqwpP01wFchROYUJtQhd0fW_Klj0gL0kaCNcbKvv8zPCT1omMk",
        "d": "iBgXCMsnSX5xLaX9Kzu397pRKY9DOynBfZ47aBZd-UrjCPCYTh5J17geX8oYObKNAz2jRuLsvRsLGVLNm_ACNviaYDWsU8qPkCJNnESiYt0WEfwlcayrVwsWRiErtAu4XmPLemDdiWccxvvwtwunmd7aRWh3G53_m66RoeaIUtWfJUycbFcpzf_DQwkP9r_ehUVWHFRcBpuL-JHREYI75MzlVJkvJtXza23J2dor-lQsr-V7EFb_AfMWvWW5vYxEGq91UEOREu1VrIptv7BcRfsJ8XiOswygT733O73EKbxEBSwKDMu_5sK3bmJ1r0Rccq_0aWUuzip6-hIBaf_jgQ",
        "e": "AQAB",
        "use": "sig",
        "kid": "NL46kVh-RNggYlO3t92lOcCr981DqdxKHJyDZ5DwZ2g",
        "qi": "D105pFSf0VioA3Eu3JuBgsDg7OPrBd9_ToQ5tz1M-HPNoNqvQb8SIVu6IPlDroc9qhD8uNUWIY_i3Dkj3vajD69hlCQxRVNekvuxUtrqvRs7P0NTkaqc8bRpbHG3XZXSmjdaC7V-47HJSln62bDLViSJC5BQeEGlEykVzIM8dn0",
        "dp": "C9q_sGKBnSqulC8hzpeGjRVfeq29NZ5PNKvNfjImnXBz3OGy1WHvHJELd4rCrLnaNXKvlzwws26riQk5_op3M7tG2yxSTV5QD3BvxVkcEwMTMOVXKkQxUoTc3kFEHdJq8bjL72nlpY7-Q9ognqsNa3L0R9SQWgAOhfq7RSSgslk",
        "alg": "RS256",
        "dq": "nQK6yQkZleTWpgzFPLpbrYcbi5QmnY_gtM2WaKkmqT8oHLofV8mDVPCakIefuya7M6zi60JZBHim87mEfhkJ1aqaArwyMvaFV4RzxYI4F2_2TEgx8Zw9iVQJKRu6KiTzMGH4JcX8gM0qv7vuand3Xok4iw70rHof0_eWGp43Avk",
        "n": "uyJnJwRfX6tobS4swk_KIpS-KOM0QL0L8-yVWiBz7d8hWpwBqzxRX3-6AKslhZL1aC6zGT7Z6y4jqpvdfSrXVbpgJeYtqaW32P5zpN_Rziyg6jG73E3NH3St5y6p6CujMqEfilSgoZbdsIhA_Eu_XGhlACeDUz-D3vJlhHFdY-jymaV6uTW_ojC-oQBpHuTOnUZPlgw9AeL39vuACNsX2ci94T7c8j42Wborr-jVEsxPOQoYOCBOHFNkpRlvie4oqb3o6w5Nvz3rayazRQ2NNv5kLEpw59Fl2sBWP-TInQ_gC8Kkwi_bNShjycgpNQuoHyQSH5Dz9IyIylokghiQ0Q"
    },
    rsaPublicKeyInJson: {
        "kty": "RSA",
        "e": "AQAB",
        "use": "sig",
        "kid": "NL46kVh-RNggYlO3t92lOcCr981DqdxKHJyDZ5DwZ2g",
        "alg": "RS256",
        "n": "uyJnJwRfX6tobS4swk_KIpS-KOM0QL0L8-yVWiBz7d8hWpwBqzxRX3-6AKslhZL1aC6zGT7Z6y4jqpvdfSrXVbpgJeYtqaW32P5zpN_Rziyg6jG73E3NH3St5y6p6CujMqEfilSgoZbdsIhA_Eu_XGhlACeDUz-D3vJlhHFdY-jymaV6uTW_ojC-oQBpHuTOnUZPlgw9AeL39vuACNsX2ci94T7c8j42Wborr-jVEsxPOQoYOCBOHFNkpRlvie4oqb3o6w5Nvz3rayazRQ2NNv5kLEpw59Fl2sBWP-TInQ_gC8Kkwi_bNShjycgpNQuoHyQSH5Dz9IyIylokghiQ0Q"
    }
}

/**
 * @params memoryReplSet {{
 * start: Function,
 * waitUntilRunning: Function,
 * getUri: Function
 * }}
 * @return {Promise<RulesController>}
 */
exports.getRulesController = async function (memoryReplSet) {
    try {
        process.setMaxListeners(0);
        await memoryReplSet.start();
        await memoryReplSet.waitUntilRunning();
        exports.config.mongoDbUri = await memoryReplSet.getUri();
        return new RulesController(new UpdateRuleController(), new LogController(exports.config), exports.config);
    } catch (e) {
        console.log(e);
    }
}
