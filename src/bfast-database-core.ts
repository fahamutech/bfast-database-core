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

function getDatabaseFactory(options: BFastDatabaseOptions): DatabaseAdapter{
    return (options && options.adapters && options.adapters.database)
        ? options.adapters.database(options)
        : new DatabaseFactory()
}

function getAuthFactory(options: BFastDatabaseOptions): AuthAdapter{
    return (options && options.adapters && options.adapters.auth)
        ? options.adapters.auth(options)
        : new AuthFactory()
}

function getFilesFactory(options: BFastDatabaseOptions): FilesAdapter{
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

    private _initiateServices(options: BFastDatabaseOptions): void {

    }

    init(options: BFastDatabaseOptions): WebServices {
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
            this._initiateServices(options);
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
