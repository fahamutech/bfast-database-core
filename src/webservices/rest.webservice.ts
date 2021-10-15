import httpStatus from 'http-status-codes';
import {BFastOptions} from "../bfast-database.option";
import {AuthAdapter} from "../adapters/auth.adapter";
import {FilesAdapter} from "../adapters/files.adapter";
import {
    handleRuleBlocks,
    verifyApplicationId,
    verifyBodyData,
    verifyMethod,
    verifyRequestToken
} from "../controllers/rest.controller";
import {FunctionsModel} from "../models/functions.model";


export function rulesRestAPI(
    prefix = '/',
    authAdapter: AuthAdapter,
    filesAdapter: FilesAdapter,
    options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}v2`,
        method: 'POST',
        onRequest: [
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
                options
            )
        ]
    }
}

export function authJwk(options: BFastOptions): FunctionsModel {
    return {
        path: '/jwk',
        method: 'GET',
        onRequest: (request, response) => {
            if (options.rsaPublicKeyInJson) {
                response.status(200).json(options.rsaPublicKeyInJson);
            } else {
                response.status(httpStatus.EXPECTATION_FAILED).json({message: 'fail to retrieve public key'});
            }
        }
    }
}

