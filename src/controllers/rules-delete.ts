import {DeleteModel} from "../models/delete-model";
import {ruleHasPermission} from "./policy";
import {removeDataInStore} from "./database";
import {RuleResponse} from "../models/rule-response";
import {RuleContext} from "../models/rule-context";
import {BFastOptions} from "../bfast-option";
import {DatabaseAdapter} from "../adapters/database";

async function hasDeletePermission(
    domain: string, databaseAdapter: DatabaseAdapter, context: RuleContext, options: BFastOptions
) {
    const allowed = await ruleHasPermission(`delete.${domain}`, context, databaseAdapter, options);
    if (allowed !== true) throw {message: 'You have insufficient permission to this resource'};
}

async function handleDeleteOneRule(
    domain: string, ruleData: DeleteModel, ruleResponse: RuleResponse, databaseAdapter: DatabaseAdapter,
    context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    const filter: any = {};
    delete ruleData.filter;
    filter._id = ruleData.id;
    ruleData.filter = filter;
    const wOptions = {bypassDomainVerification: context && context.useMasterKey === true, transaction: null}
    ruleResponse[`delete${domain}`] =
        await removeDataInStore(domain, ruleData, context, databaseAdapter, wOptions, options)
    return ruleResponse
}

async function handleDeleteManyRule(
    domain: string, ruleData: DeleteModel, ruleResponse: RuleResponse, databaseAdapter: DatabaseAdapter,
    context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    if (!ruleData.filter) throw new Error('filter field is required if you dont supply id field')
    if (ruleData?.filter && Array.isArray(ruleData?.filter) && ruleData.filter.length === 0)
        throw new Error('Empty filter array is not supported in delete rule')
    if (ruleData?.filter && Object.keys(ruleData?.filter).length === 0)
        throw new Error('Empty filter map is not supported in delete rule')
    const wOptions = {bypassDomainVerification: context && context.useMasterKey === true, transaction: null}
    ruleResponse[`delete${domain}`] =
        await removeDataInStore(domain, ruleData, context, databaseAdapter, wOptions, options)
    return ruleResponse
}

export async function handleDeleteRule(
    domain: string, ruleData: DeleteModel, ruleResponse: RuleResponse, databaseAdapter: DatabaseAdapter,
    context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    await hasDeletePermission(domain, databaseAdapter, context, options)
    if (ruleData.id) return handleDeleteOneRule(domain, ruleData, ruleResponse, databaseAdapter, context, options);
    else return handleDeleteManyRule(domain, ruleData, ruleResponse, databaseAdapter, context, options);
}
