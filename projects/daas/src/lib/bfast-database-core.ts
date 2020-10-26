import {DatabaseFactory} from './factory/database.factory';
import {DatabaseController} from './controllers/database.controller';
import {SecurityController} from './controllers/security.controller';
import {BFastDatabaseConfigAdapter} from './bfast.config';


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

  /**
   * initiate bfast::database engine without a built in server
   * @param options {BFastDatabaseConfigAdapter} - configurations
   */
  async init(options: BFastDatabaseConfigAdapter): Promise<any> {
    if (BfastDatabaseCore.validateOptions(options, false).valid) {
      return BfastDatabaseCore.setUpDatabase(options);
    } else {
      throw new Error(BfastDatabaseCore.validateOptions(options, false).message);
    }
  }
}
