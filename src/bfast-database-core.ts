import { DatabaseFactory } from './factory/database.factory';
import { DatabaseController } from './controllers/database.controller';
import { SecurityController } from './controllers/security.controller';
import { BFastDatabaseOptions } from './bfast-database.option';
import { Provider } from './provider';
import { RealtimeWebservice } from './webservices/realtime.webservice';
import { AuthController } from './controllers/auth.controller';
import { AuthFactory } from './factory/auth.factory';
import { StorageController } from './controllers/storage.controller';
import { S3StorageFactory } from './factory/s3-storage.factory';
import { FilesAdapter } from './adapters/files.adapter';
import { RestController } from './controllers/rest.controller';
import { RestWebservice } from './webservices/rest.webservice';
import { StorageWebservice } from './webservices/storage.webservice';
import { AuthAdapter } from './adapters/auth.adapter';
import { GridFsStorageFactory } from './factory/grid-fs-storage.factory';
import { WebServices } from './webservices/index.webservice';

export class BfastDatabaseCore {

    /**
     * check if all required options is valid
     * @param options {BFastDatabaseOptions} - bfast database configurations
     * @param serverMode {boolean} - if true will check for port option is is set
     * @private
     */
    private static validateOptions(options: BFastDatabaseOptions, serverMode = true): { valid: boolean, message: string } {
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
        } else if (!options.port && serverMode === true) {
            return {
                valid: false,
                message: 'Port option required'
            };
        }
        else if (!options.masterKey) {
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

    /**
     *
     * @param options {BFastDatabaseOptions}
     * @private
     */
    private static async _setUpDatabase(options: BFastDatabaseOptions): Promise<any> {
        const database: DatabaseController = new DatabaseController(
            (options && options.adapters && options.adapters.database)
                ? options.adapters.database(options)
                : new DatabaseFactory(options),
            new SecurityController(options)
        );
        await database.init();
    }

    /**
     *
     * @param options {BFastDatabaseOptions}
     * @private
     */
    private _initiateServices(options: BFastDatabaseOptions): void {
        const databaseFactory = options.adapters && options.adapters.database
            ? options.adapters.database(options)
            : new DatabaseFactory(options);
        Provider.service('SecurityController', _ => new SecurityController(options));
        Provider.service('DatabaseController', _ => new DatabaseController(databaseFactory, Provider.get('SecurityController')));
        Provider.service('RealtimeWebservice', _ => new RealtimeWebservice(Provider.get('DatabaseController')));
        const authFactory: AuthAdapter = options.adapters && options.adapters.auth
            ? options.adapters.auth(options)
            : new AuthFactory(Provider.get('DatabaseController'), Provider.get('SecurityController'));
        Provider.service('AuthController', _ => new AuthController(authFactory, Provider.get('DatabaseController')));
        const fileFactory: FilesAdapter = options.adapters && options.adapters.s3Storage
            ? new S3StorageFactory(options)
            : new GridFsStorageFactory(options, options.mongoDbUri);
        Provider.service('StorageController', _ => new StorageController(fileFactory, Provider.get('SecurityController'), options));
        Provider.service('RestController', _ => new RestController(
            Provider.get('SecurityController'),
            Provider.get('AuthController'),
            Provider.get('StorageController'),
            options)
        );
        Provider.service('RealtimeWebService', _ => new RealtimeWebservice(Provider.get('DatabaseController')));
        Provider.service('RestWebservice', _ => new RestWebservice(Provider.get('RestController'), options));
        Provider.service('StorageWebservice', _ => new StorageWebservice(Provider.get('RestController')));
    }

    /**
     * initiate bfast::database engine without a built in server
     * @param options {BFastDatabaseOptions} - configurations
     * @param serveMode {boolean}
     */
    init(options: BFastDatabaseOptions, serveMode = false): WebServices {
        if (BfastDatabaseCore.validateOptions(options, serveMode).valid) {
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
                Provider.get(Provider.names.REST_WEB_SERVICE),
                Provider.get(Provider.names.REALTIME_WEB_SERVICE),
                Provider.get(Provider.names.STORAGE_WEB_SERVICE)
            );
        } else {
            throw new Error(BfastDatabaseCore.validateOptions(options, serveMode).message);
        }
    }
}
