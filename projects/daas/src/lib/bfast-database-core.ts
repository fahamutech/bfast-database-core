import {Database} from "./factory/Database";
import {DatabaseController} from "./controllers/database.controller";
import {SecurityController} from "./controllers/security.controller";
import {BfastConfig, BFastDatabaseConfigAdapter} from "./bfast.config";


export class BfastDatabaseCore {

  /**
   * initiate bfast::database engine without a built in server
   * @param options
   */
  async init(options: BFastDatabaseConfigAdapter): Promise<any> {
    if (BfastDatabaseCore._validateOptions(options, false).valid) {
      BfastDatabaseCore._registerOptions(options);
      return BfastDatabaseCore._setUpDatabase(options);
    } else {
      throw new Error(BfastDatabaseCore._validateOptions(options, false).message);
    }
  }

  /**
   * check if all required options is valid
   * @param options {BfastConfig} - bfast database configurations
   * @param serverMode {boolean} - if true will check for port option is is set
   * @private
   */
  private static _validateOptions(options: BFastDatabaseConfigAdapter, serverMode = true)
    : { valid: boolean, message: string } {
    if (!options.port && serverMode === true) {
      return {
        valid: false,
        message: 'Port option required'
      }
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
      }
    } else {
      if (!options.mongoDbUri) {
        if (!options.adapters && !options.adapters?.database) {
          return {
            valid: false,
            message: 'mongoDbUri required, or supply database adapter instead'
          }
        }
      }
      return {
        valid: true,
        message: 'no issues'
      }
    }
  }

  /**
   *
   * @param config {BfastConfig}
   * @private
   */
  private static async _setUpDatabase(config: BFastDatabaseConfigAdapter) {
    const database: DatabaseController = new DatabaseController(
      (config && config.adapters && config.adapters.database)
        ? config.adapters.database(config)
        : new Database(config),
      new SecurityController()
    )
    return database.init();
  }

  /**
   *
   * @param options {BfastConfig}
   * @private
   */
  private static _registerOptions(options: BFastDatabaseConfigAdapter) {
    BfastConfig.getInstance().addValues(options);
  }
}
