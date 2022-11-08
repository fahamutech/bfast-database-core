import {AuthAdapter} from "../../adapters/auth";
import {FilesAdapter} from "../../adapters/files";
import {DatabaseAdapter} from "../../adapters/database";
import {BFastOptions, BFastOptionsFn} from "../../bfast-option";
import {devLog} from "../../utils";
import {RuleResponse} from "../../models/rule-response";
import {
    handleAggregationRules,
    handleAuthenticationRule, handleBulkRules,
    handleCreateRules, handleDeleteRules,
    handlePolicyRule, handleQueryRules, handleStorageRules,
    handleUpdateRules
} from "../../controllers/rules/rules";
import httpStatus from "http-status-codes";
import {FunctionsModel} from "../../models/functions.model";
import {verifyApplicationId, verifyRequestToken} from "../../controllers/rest/rest";
import {verifyBodyData, verifyMethod} from "./index";

function handleRuleBlocks(
    request: any, response: any, _: any, authAdapter: AuthAdapter, filesAdapter: FilesAdapter,
    databaseAdapter: DatabaseAdapter, options: BFastOptions,
): void {
    const body = request.body;
    try {
        devLog(JSON.stringify(body));
    } catch (e) {
    }
    const results: RuleResponse = {errors: {}};
    handleAuthenticationRule(body, results, authAdapter, databaseAdapter, options).then(_1 => {
        return handlePolicyRule(body, results, databaseAdapter, options);
    }).then(_2 => {
        return handleCreateRules(body, results, databaseAdapter, options, null);
    }).then(_3 => {
        return handleUpdateRules(body, results, databaseAdapter, options, null);
    }).then(_4 => {
        return handleDeleteRules(body, results, databaseAdapter, options, null);
    }).then(_5 => {
        return handleQueryRules(body, results, databaseAdapter, options, null);
    }).then(_6 => {
        return handleBulkRules(body, results, databaseAdapter, options);
    }).then(_8 => {
        return handleStorageRules(body, results, databaseAdapter, authAdapter, filesAdapter, options);
    }).then(_9 => {
        return handleAggregationRules(body, results, databaseAdapter, options);
    }).then(_10 => {
        if (!(results.errors && Object.keys(results.errors).length > 0)) delete results.errors;
        response.status(httpStatus.OK).json(results);
    }).catch(reason => {
        response.status(httpStatus.EXPECTATION_FAILED).json({message: reason.message ? reason.message : reason.toString()});
    });
}

export function handleRulesRestAPI(
    prefix = '/',
    authAdapter: AuthAdapter,
    filesAdapter: FilesAdapter,
    databaseAdapter: DatabaseAdapter,
    optionsFn: BFastOptionsFn
): FunctionsModel {
    return {
        path: `${prefix}v2`,
        method: 'POST',
        onRequest: [
            (rq, rs, n) => verifyMethod(rq, rs, n),
            (rq, rs, n) => verifyBodyData(rq, rs, n),
            (rq, rs, n) => verifyApplicationId(rq, rs, n, optionsFn(rq)),
            (rq, rs, n) => verifyRequestToken(rq, rs, n, optionsFn(rq)),
            (rq, rs, n) => handleRuleBlocks(rq, rs, n, authAdapter, filesAdapter, databaseAdapter, optionsFn(rq))
        ]
    }
}
