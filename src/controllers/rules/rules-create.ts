import {BFastOptions} from "../../bfast-option";
import {RuleContext} from "../../models/rule-context";
import {RuleResponse} from "../../models/rule-response";
import {ruleHasPermission} from "../policy";
import {DatabaseAdapter} from "../../adapters/database";
import {writeManyDataInStore, writeOneDataInStore} from "../database/write";

async function hasCreatePermission(
    domain: string, context: RuleContext, databaseAdapter: DatabaseAdapter, options: BFastOptions
) {
    const allowed = await ruleHasPermission(`create.${domain}`, context, databaseAdapter, options);
    if (allowed !== true) throw {message: 'You have insufficient permission to this resource'}
}

async function createMany(
    domain: string, ruleData, databaseAdapter: DatabaseAdapter, context: RuleContext, options: BFastOptions
) {
    const wOptions = {bypassDomainVerification: context?.useMasterKey === true, transaction: null}
    return writeManyDataInStore(domain, ruleData,  context, databaseAdapter, wOptions, options);
}

async function createOne(
    domain, ruleData, databaseAdapter: DatabaseAdapter, context: RuleContext, options: BFastOptions
) {
    const wOptions = {bypassDomainVerification: context?.useMasterKey === true, transaction: null};
    return writeOneDataInStore(domain, ruleData, context, databaseAdapter, wOptions, options);
}

export async function createRule(
    domain: string, ruleData, ruleResponse: RuleResponse, databaseAdapter: DatabaseAdapter,
    context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    await hasCreatePermission(domain, context, databaseAdapter, options);
    let result;
    if (ruleData && Array.isArray(ruleData)) {
        result = await createMany(domain, ruleData, databaseAdapter, context, options);
    } else {
        result = await createOne(domain, ruleData, databaseAdapter, context, options);
    }
    ruleResponse[`create${domain}`] = result;
    return ruleResponse
}
