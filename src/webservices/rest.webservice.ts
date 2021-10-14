import {functions} from 'bfast';
import httpStatus from 'http-status-codes';
import {BFastOptions} from "../bfast-database.option";
import {AuthAdapter} from "../adapters/auth.adapter";
import {FilesAdapter} from "../adapters/files.adapter";
import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn, PurgeNodeFn,
    UpsertDataFn,
    UpsertNodeFn
} from "../adapters/database.adapter";
import {
    handleRuleBlocks,
    verifyApplicationId,
    verifyBodyData,
    verifyMethod,
    verifyRequestToken
} from "../controllers/rest.controller";


export function rulesRestAPI(
    prefix = '/',
    authAdapter: AuthAdapter,
    filesAdapter: FilesAdapter,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getDataInStore: GetDataFn,
    upsertNode: UpsertNodeFn<any>,
    upsertDataInStore: UpsertDataFn<any>,
    purgeNode: PurgeNodeFn,
    options: BFastOptions
): { path: string, onRequest: any, method: string } {
    return functions().onPostHttpRequest(`${prefix}v2`, [
        (rq, rs, n) => verifyMethod(rq, rs, n),
        (rq, rs, n) => verifyBodyData(rq, rs, n),
        (rq, rs, n) => verifyApplicationId(
            rq,
            rs,
            n,
            options
        ),
        (rq, rs, n) => verifyRequestToken(
            rq as any,
            rs as any,
            n,
            options
        ),
        (rq, rs, n) => handleRuleBlocks(
            rq as any,
            rs as any,
            n,
            authAdapter,
            filesAdapter,
            getNodes,
            getNode,
            getDataInStore,
            upsertNode,
            upsertDataInStore,
            purgeNode,
            options
        )
    ]);
}

export function authJwk(options: BFastOptions) {
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

