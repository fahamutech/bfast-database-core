import {DatabaseFactory} from './factory/database.factory';
import {DatabaseController} from './controllers/database.controller';
import {SecurityController} from './controllers/security.controller';
import {BFastDatabaseOptions} from './bfast-database.option';
import {Provider} from './provider';
import {RealtimeWebservice} from './webservices/realtime.webservice';
import {AuthController} from './controllers/auth.controller';
import {AuthFactory} from './factory/auth.factory';
import {StorageController} from './controllers/storage.controller';
import {S3StorageFactory} from './factory/s3-storage.factory';
import {FilesAdapter} from './adapters/files.adapter';
import {RestController} from './controllers/rest.controller';
import {RestWebservice} from './webservices/rest.webservice';
import {StorageWebservice} from './webservices/storage.webservice';
import {AuthAdapter} from './adapters/auth.adapter';
import {WebServices} from './webservices/index.webservice';
import {IpfsStorageFactory} from "./factory/ipfs-storage.factory";
import {RulesController} from "./controllers/rules.controller";
import {LogController} from "./controllers/log.controller";
import {UpdateRuleController} from "./controllers/update.rule.controller";

let _dFactory;

function defaultDatabaseFactory(options: BFastDatabaseOptions) {
    if (_dFactory) {
        return _dFactory;
    }
    _dFactory = new DatabaseFactory(options);
    return _dFactory;
}

export class BfastDatabaseCore {

    /**
     * check if all required options is valid
     * @param options {BFastDatabaseOptions} - bfast database configurations
     * @param serverMode {boolean} - if true will check for port option is is set
     * @private
     */
    private static validateOptions(
        options: BFastDatabaseOptions,
        serverMode = true
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
        } else if (!options.port && serverMode === true) {
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

    /**
     *
     * @param options {BFastDatabaseOptions}
     * @private
     */
    private static async _setUpDatabase(options: BFastDatabaseOptions): Promise<any> {
        const database: DatabaseController = new DatabaseController(
            (options && options.adapters && options.adapters.database)
                ? options.adapters.database(options)
                : defaultDatabaseFactory(options),
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
        const ipfsFactory = new IpfsStorageFactory(
            options,
            defaultDatabaseFactory(options),
            options.mongoDbUri
        );
        const databaseFactory = options.adapters && options.adapters.database
            ? options.adapters.database(options)
            : defaultDatabaseFactory(options);
        const fileFactory: FilesAdapter = options.adapters && options.adapters.s3Storage
            ? new S3StorageFactory(options)
            : ipfsFactory
        const securityController = new SecurityController(options);
        const logController = new LogController(options);
        const databaseController = new DatabaseController(databaseFactory, securityController);
        const realtimeController = new RealtimeWebservice(databaseController);
        const storageController = new StorageController(fileFactory, securityController, options);
        const authFactory: AuthAdapter = options.adapters && options.adapters.auth
            ? options.adapters.auth(options)
            : new AuthFactory(databaseController, securityController);
        const authController = new AuthController(authFactory, databaseController);
        const updateRuleController = new UpdateRuleController();
        const rulesController = new RulesController(
            updateRuleController,
            logController,
            databaseController,
            authController,
            storageController,
            options,
        );
        const restController = new RestController(
            securityController,
            authController,
            storageController,
            rulesController,
            options
        );
        const realtimeWebServices = new RealtimeWebservice(databaseController);
        const restWebServices = new RestWebservice(restController, options);
        const storageWebService = new StorageWebservice(restController);

        Provider.service(Provider.names.SECURITY_CONTROLLER, _ => securityController);
        Provider.service(Provider.names.LOG_CONTROLLER, _ => logController);
        Provider.service(Provider.names.DATABASE_CONTROLLER, _ => databaseController);
        Provider.service(Provider.names.REALTIME_CONTROLLER, _ => realtimeController);
        Provider.service(Provider.names.AUTH_CONTROLLER, _ => authController);
        Provider.service(Provider.names.STORAGE_CONTROLLER, _ => storageController);
        Provider.service(Provider.names.REST_CONTROLLER, _ => restController);
        Provider.service(Provider.names.REALTIME_WEB_SERVICE, _ => realtimeWebServices);
        Provider.service(Provider.names.REST_WEB_SERVICE, _ => restWebServices);
        Provider.service(Provider.names.STORAGE_WEB_SERVICE, _ => storageWebService);
        Provider.service(Provider.names.DATABASE_FACTORY, _ => defaultDatabaseFactory(options));
        Provider.service(Provider.names.IPFS_STORAGE_FACTORY, _ => ipfsFactory);
        // console.log(Provider.services)
    }

    /**
     * initiate bfast::database engine without a built in server
     * @param options {BFastDatabaseOptions} - configurations
     * @param serveMode {boolean}
     * @return Promise<WebServices>
     */
    async init(options: BFastDatabaseOptions, serveMode = false): Promise<WebServices> {
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
