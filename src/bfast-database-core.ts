import {DatabaseFactory} from './factory/database.factory';
import {DatabaseController} from './controllers/database.controller';
import {BFastDatabaseOptions} from './bfast-database.option';
import {WebServices} from './webservices/index.webservice';
import {RulesController} from "./controllers/rules.controller";
import {RestController} from "./controllers/rest.controller";
import {UpdateRuleController} from "./controllers/update.rule.controller";
import {AuthController} from "./controllers/auth.controller";
import {DatabaseAdapter} from "./adapters/database.adapter";
import {StorageController} from "./controllers/storage.controller";
import {SecurityController} from "./controllers/security.controller";
import {AuthFactory} from "./factory/auth.factory";
import {AuthAdapter} from "./adapters/auth.adapter";
import {FilesAdapter} from "./adapters/files.adapter";
import {S3StorageFactory} from "./factory/s3-storage.factory";
import {IpfsStorageFactory} from "./factory/ipfs-storage.factory";

function getDatabaseFactory(options: BFastDatabaseOptions): DatabaseAdapter {
    return (options && options.adapters && options.adapters.database)
        ? options.adapters.database(options)
        : new DatabaseFactory()
}

function getAuthFactory(options: BFastDatabaseOptions): AuthAdapter {
    return (options && options.adapters && options.adapters.auth)
        ? options.adapters.auth(options)
        : new AuthFactory()
}

function getFilesFactory(options: BFastDatabaseOptions): FilesAdapter {
    return (options && options.adapters && options.adapters.s3Storage && typeof options.adapters.s3Storage === "object")
        ? new S3StorageFactory()
        : new IpfsStorageFactory()
}

export class BfastDatabaseCore {

    private static validateOptions(
        options: BFastDatabaseOptions
    ): { valid: boolean, message: string } {
        if (!options.rsaPublicKeyInJson) {
            return {
                valid: false,
                message: 'rsa public key in json format required, for jwk'
            };
        } else if (!options.rsaKeyPairInJson) {
            return {
                valid: false,
                message: 'rsa key pair in json format required, for jwk'
            };
        } else if (!options.port) {
            return {
                valid: false,
                message: 'Port option required'
            };
        } else if (!options.masterKey) {
            return {
                valid: false,
                message: 'MasterKey required'
            };
        } else {
            if (!options.mongoDbUri) {
                if (!options.adapters && !options.adapters?.database) {
                    return {
                        valid: false,
                        message: 'mongoDbUri required, or supply database adapters instead'
                    };
                }
            }
            return {
                valid: true,
                message: 'no issues'
            };
        }
    }

    private static async _setUpDatabase(options: BFastDatabaseOptions): Promise<any> {
        const database: DatabaseController = new DatabaseController();
        await database.init(getDatabaseFactory(options), options);
    }

    init(options: BFastDatabaseOptions): WebServices {
        options = Object.assign(options, {
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
        });
        if (BfastDatabaseCore.validateOptions(options).valid) {
            if (options && options.rsaKeyPairInJson && typeof options.rsaKeyPairInJson === "object") {
                options.rsaKeyPairInJson.alg = 'RS256';
                options.rsaKeyPairInJson.use = 'sig';
            }
            if (options && options.rsaPublicKeyInJson && typeof options.rsaPublicKeyInJson === "object") {
                options.rsaPublicKeyInJson.alg = 'RS256';
                options.rsaPublicKeyInJson.use = 'sig';
            }
            if (!options.adapters) {
                options.adapters = {};
            }
            BfastDatabaseCore._setUpDatabase(options).catch(_ => {
                console.error(_);
                process.exit(-1);
            });
            return new WebServices(
                new RestController(),
                new RulesController(),
                new UpdateRuleController(),
                new SecurityController(),
                new DatabaseController(),
                new AuthController(),
                new StorageController(),
                getAuthFactory(options),
                getDatabaseFactory(options),
                getFilesFactory(options),
                options
            );
        } else {
            throw new Error(BfastDatabaseCore.validateOptions(options).message);
        }
    }

}
