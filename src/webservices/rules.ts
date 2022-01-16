import httpStatus from 'http-status-codes';
import {BFastOptions} from "../bfast-option";
import {AuthAdapter} from "../adapters/auth.adapter";
import {FilesAdapter} from "../adapters/files.adapter";
import {verifyApplicationId, verifyRequestToken} from "../controllers/rest";
import {FunctionsModel} from "../models/functions.model";
import {devLog} from "../utils/debug";
import {RuleResponse} from "../models/rule-response";
import {
    handleAggregationRules,
    handleAuthenticationRule,
    handleBulkRules,
    handleCreateRules,
    handleDeleteRules,
    handlePolicyRule,
    handleQueryRules,
    handleStorageRules,
    handleUpdateRules
} from "../controllers/rules";

function verifyMethod(request: any, response: any, next: any): void {
    if (request.method === 'POST') {
        next();
    } else {
        response.status(httpStatus.FORBIDDEN).json({message: 'HTTP method not supported'});
    }
}

function verifyBodyData(request: any, response: any, next: any): void {
    const body = request.body;
    if (!body) {
        response.status(httpStatus.BAD_REQUEST).json({message: 'require non empty rule blocks request'});
    } else if (Object.keys(body).length === 0) {
        response.status(httpStatus.BAD_REQUEST).json({message: 'require non empty rule blocks request'});
    } else {
        delete body.context;
        next();
    }
}

function handleRuleBlocks(
    request: any, response: any, _: any, authAdapter: AuthAdapter, filesAdapter: FilesAdapter,
    options: BFastOptions,
): void {
    const body = request.body;
    try {
        devLog(JSON.stringify(body));
    } catch (e) {
        console.log(e);
    }
    const results: RuleResponse = {errors: {}};
    handleAuthenticationRule(body, results, authAdapter, options).then(_1 => {
        return handlePolicyRule(body, results, options);
    }).then(_2 => {
        return handleCreateRules(body, results, options, null);
    }).then(_3 => {
        return handleUpdateRules(body, results, options, null);
    }).then(_4 => {
        return handleDeleteRules(body, results, options, null);
    }).then(_5 => {
        return handleQueryRules(body, results, options, null);
    }).then(_6 => {
        return handleBulkRules(body, results, options);
    }).then(_8 => {
        return handleStorageRules(body, results, authAdapter, filesAdapter, options);
    }).then(_9 => {
        return handleAggregationRules(body, results, options);
    }).then(_10 => {
        if (!(results.errors && Object.keys(results.errors).length > 0)) {
            delete results.errors;
        }
        response.status(httpStatus.OK).json(results);
    }).catch(reason => {
        response.status(httpStatus.EXPECTATION_FAILED).json({message: reason.message ? reason.message : reason.toString()});
    });
}

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
            (rq, rs, n) => verifyApplicationId(rq, rs, n, options),
            (rq, rs, n) => verifyRequestToken(rq, rs, n, options),
            (rq, rs, n) => handleRuleBlocks(rq, rs, n, authAdapter, filesAdapter, options)
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

