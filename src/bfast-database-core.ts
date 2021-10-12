import {BFastOptions} from './bfast-database.option';
import {WebServices} from './webservices/index.webservice';
import {RulesController} from "./controllers/rules.controller";
import {RestController} from "./controllers/rest.controller";
import {UpdateRuleController} from "./controllers/update.rule.controller";
import {AuthController} from "./controllers/auth.controller";
import {StorageController} from "./controllers/storage.controller";
import {SecurityController} from "./controllers/security.controller";
import {AuthFactory} from "./factory/auth.factory";
import {AuthAdapter} from "./adapters/auth.adapter";
import {FilesAdapter} from "./adapters/files.adapter";
import {S3StorageFactory} from "./factory/s3-storage.factory";
import {IpfsStorageFactory} from "./factory/ipfs-storage.factory";
import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn,
    InitDatabaseFn,
    PurgeNodeValueFn,
    UpsertDataFn,
    UpsertNodeFn
} from "./adapters/database.adapter";

function getAuthFactory(options: BFastOptions): AuthAdapter {
    return (options && options.adapters && options.adapters.auth)
        ? options.adapters.auth(options)
        : new AuthFactory()
}

function getFilesFactory(options: BFastOptions): FilesAdapter {
    return (options && options.adapters && options.adapters.s3Storage && typeof options.adapters.s3Storage === "object")
        ? new S3StorageFactory()
        : new IpfsStorageFactory()
}

export class BfastDatabaseCore {

    private static validateOptions(
        options: BFastOptions
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
                return {
                    valid: false,
                    message: 'mongoDbUri required, or supply database adapters instead'
                };
            }
            return {
                valid: true,
                message: 'no issues'
            };
        }
    }

    private static async _setUpDatabase(init: InitDatabaseFn, options: BFastOptions): Promise<any> {
        return await init(options);
    }

    init(
        initDb: InitDatabaseFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        purgeNodeValue: PurgeNodeValueFn,
        options: BFastOptions
    ): WebServices {
        options = Object.assign(options, {
            rsaKeyPairInJson: {},
            rsaPublicKeyInJson: {}
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
            BfastDatabaseCore._setUpDatabase(initDb, options).catch(_ => {
                console.error(_);
                process.exit(-1);
            });
            return new WebServices(
                new RestController(),
                new RulesController(),
                new UpdateRuleController(),
                new SecurityController(),
                new AuthController(),
                new StorageController(),
                getAuthFactory(options),
                getFilesFactory(options),
                getNodes,
                getNode,
                getDataInStore,
                upsertNode,
                upsertDataInStore,
                purgeNodeValue,
                options
            );
        } else {
            throw new Error(BfastDatabaseCore.validateOptions(options).message);
        }
    }

}
