import {functions} from 'bfast';
import httpStatus from 'http-status-codes';
import {BFastDatabaseOptions} from "../bfast-database.option";
import {RestController} from "../controllers/rest.controller";
import {SecurityController} from "../controllers/security.controller";
import {RulesController} from "../controllers/rules.controller";
import {AuthController} from "../controllers/auth.controller";
import {UpdateRuleController} from "../controllers/update.rule.controller";
import {DatabaseController} from "../controllers/database.controller";
import {StorageController} from "../controllers/storage.controller";
import {AuthAdapter} from "../adapters/auth.adapter";
import {DatabaseAdapter} from "../adapters/database.adapter";
import {FilesAdapter} from "../adapters/files.adapter";

export class RestWebservice {

    constructor() {
    }

    rulesV2(
        prefix = '/',
        securityController: SecurityController,
        restController: RestController,
        rulesController: RulesController,
        authController: AuthController,
        updateRuleController: UpdateRuleController,
        databaseController: DatabaseController,
        storageController: StorageController,
        authAdapter: AuthAdapter,
        filesAdapter: FilesAdapter,
        databaseAdapter: DatabaseAdapter,
        options: BFastDatabaseOptions
    ): { path: string, onRequest: any, method: string } {
        return functions().onPostHttpRequest(`${prefix}v2`, [
            (rq, rs, n) => restController.verifyMethod(rq, rs, n),
            (rq, rs, n) => restController.verifyBodyData(rq, rs, n),
            (rq, rs, n) => restController
                .verifyApplicationId(
                    rq,
                    rs,
                    n,
                    options
                ),
            (rq, rs, n) => restController
                .verifyToken(
                    rq as any,
                    rs as any,
                    n,
                    securityController,
                    options
                ),
            (rq, rs, n) => restController
                .handleRuleBlocks(
                    rq as any,
                    rs as any,
                    n,
                    rulesController,
                    authController,
                    updateRuleController,
                    databaseController,
                    securityController,
                    storageController,
                    authAdapter,
                    databaseAdapter,
                    filesAdapter,
                    options
                )
        ]);
    }

    authJwk(options: BFastDatabaseOptions) {
        return functions().onHttpRequest(
            '/jwk',
            (request, response) => {
                if (options.rsaPublicKeyInJson) {
                    response.status(200).json(options.rsaPublicKeyInJson);
                } else {
                    response.status(httpStatus.EXPECTATION_FAILED).json({message: 'fail to retrieve public key'});
                }
            }
        )
    }

}
