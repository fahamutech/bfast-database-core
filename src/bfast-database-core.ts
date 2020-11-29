import {DatabaseFactory} from './factory/database.factory';
import {DatabaseController} from './controllers/database.controller';
import {SecurityController} from './controllers/security.controller';
import {BFastDatabaseConfigAdapter} from './bfast.config';
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
import {GridFsStorageFactory} from './factory/grid-fs-storage.factory';


export class BfastDatabaseCore {

  /**
   * check if all required options is valid
   * @param options {BFastDatabaseConfigAdapter} - bfast database configurations
   * @param serverMode {boolean} - if true will check for port option is is set
   * @private
   */
  private static validateOptions(options: BFastDatabaseConfigAdapter, serverMode = true)
    : { valid: boolean, message: string } {
    if (!options.port && serverMode === true) {
      return {
        valid: false,
        message: 'Port option required'
      };
    }
      // else if (false /*!options.mountPath*/) {
      //     return {
      //         valid: false,
      //         message: 'Mount Path required'
      //     }
      // } else if (false /*options?.mountPath === '/storage' || options?.mountPath === '/changes'*/) {
      //     return {
      //         valid: false,
      //         message: 'Mount path name not supported'
      //     }
    // }
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
   * @param config {BFastDatabaseConfigAdapter}
   * @private
   */
  private static async setUpDatabase(config: BFastDatabaseConfigAdapter): Promise<any> {
    const database: DatabaseController = new DatabaseController(
      (config && config.adapters && config.adapters.database)
        ? config.adapters.database(config)
        : new DatabaseFactory(config),
      new SecurityController()
    );
    return database.init();
  }

  initiateServices(config: BFastDatabaseConfigAdapter): void {
    const databaseFactory = config.adapters && config.adapters.database
      ? config.adapters.database(config)
      : new DatabaseFactory(config);
    Provider.service('SecurityController', container => new SecurityController());
    Provider.service('DatabaseController', container => new DatabaseController(databaseFactory, Provider.get('SecurityController')));
    Provider.service('RealtimeWebservice', container => new RealtimeWebservice(Provider.get('DatabaseController')));
    const authFactory: AuthAdapter = config.adapters && config.adapters.auth
      ? config.adapters.auth(config)
      : new AuthFactory(Provider.get('DatabaseController'), Provider.get('SecurityController'));
    Provider.service('AuthController', container => new AuthController(authFactory, Provider.get('DatabaseController')));
    const fileFactory: FilesAdapter = config.adapters && config.adapters.s3Storage
      ? new S3StorageFactory(Provider.get('SecurityController'), config)
      : new GridFsStorageFactory(Provider.get('SecurityController'), config, config.mongoDbUri);
    Provider.service('StorageController', container => new StorageController(fileFactory, config));
    Provider.service('RestController', container => new RestController(
      Provider.get('SecurityController'),
      Provider.get('AuthController'),
      Provider.get('StorageController'),
      config)
    );
    Provider.service('RealtimeWebService', container => new RealtimeWebservice(Provider.get('DatabaseController')));
    Provider.service('RestWebservice', container => new RestWebservice(Provider.get('RestController')));
    Provider.service('StorageWebservice', container => new StorageWebservice(Provider.get('RestController')));
  }

  /**
   * initiate bfast::database engine without a built in server
   * @param options {BFastDatabaseConfigAdapter} - configurations
   */
  async init(options: BFastDatabaseConfigAdapter): Promise<any> {
    if (BfastDatabaseCore.validateOptions(options, false).valid) {
      if (!options.adapters) {
        options.adapters = {};
      }
      this.initiateServices(options);
      return BfastDatabaseCore.setUpDatabase(options);
    } else {
      throw new Error(BfastDatabaseCore.validateOptions(options, false).message);
    }
  }
}
