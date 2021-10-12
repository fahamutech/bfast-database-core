import {functions} from 'bfast';
import httpStatus from 'http-status-codes';
import {BFastOptions} from "../bfast-database.option";
import {RestController} from "../controllers/rest.controller";
import {SecurityController} from "../controllers/security.controller";
import {RulesController} from "../controllers/rules.controller";
import {AuthController} from "../controllers/auth.controller";
import {UpdateRuleController} from "../controllers/update.rule.controller";
import {StorageController} from "../controllers/storage.controller";
import {AuthAdapter} from "../adapters/auth.adapter";
import {FilesAdapter} from "../adapters/files.adapter";
import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn,
    PurgeNodeValueFn,
    UpsertDataFn,
    UpsertNodeFn
} from "../adapters/database.adapter";

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
        storageController: StorageController,
        authAdapter: AuthAdapter,
        filesAdapter: FilesAdapter,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        purgeNodeValue: PurgeNodeValueFn,
        options: BFastOptions
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
                    securityController,
                    storageController,
                    authAdapter,
                    filesAdapter,
                    purgeNodeValue,
                    getNodes,
                    getNode,
                    getDataInStore,
                    upsertNode,
                    upsertDataInStore,
                    purgeNodeValue,
                    options
                )
        ]);
    }

    authJwk(options: BFastOptions) {
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
