import {RuleResponse} from "../models/rule-response";
import {BFastOptions} from "../bfast-option";
import {ruleHasPermission} from "./policy";
import {findDataByFilterInStore, findDataByIdInStore} from "./database";
import {RuleContext} from "../models/rule-context";
import {DatabaseAdapter} from "../adapters/database";

async function checkQueryPermission(
    domain: string, context: RuleContext, databaseAdapter: DatabaseAdapter, options: BFastOptions
) {
    const allowed = await ruleHasPermission(`query.${domain}`, context, databaseAdapter, options);
    if (allowed !== true) throw {message: 'You have insufficient permission to this resource'}
}

export async function handleQueryRule(
    domain: string, ruleData: any, ruleResponse: RuleResponse, databaseAdapter: DatabaseAdapter,
    context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    await checkQueryPermission(domain, context, databaseAdapter, options)
    if (ruleData && Array.isArray(ruleData)) throw {message: 'query data must be a map'}
    const wOptions = {bypassDomainVerification: context && context.useMasterKey === true, transaction: null}
    if (ruleData.hasOwnProperty('id')) {
        ruleData._id = ruleData.id;
        ruleResponse[`query${domain}`] =
            await findDataByIdInStore(domain, ruleData, databaseAdapter, wOptions, options);
    } else if (ruleData.hasOwnProperty('_id')) {
        delete ruleData.id;
        ruleResponse[`query${domain}`] =
            await findDataByIdInStore(domain, ruleData, databaseAdapter, wOptions, options);
    } else {
        ruleResponse[`query${domain}`] =
            await findDataByFilterInStore(domain, ruleData, context, databaseAdapter, wOptions, options);
    }
    return ruleResponse
}