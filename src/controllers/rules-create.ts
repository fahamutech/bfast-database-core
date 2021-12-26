import {hasPermission} from "./auth.controller";
import {BFastOptions} from "../bfast-option";
import {writeMany, writeOne} from "./database.controller";
import {RuleContext} from "../models/rule-context";
import {RuleResponse} from "../models/rule-response";

async function hasCreatePermission(domain: string, context: RuleContext, options: BFastOptions) {
    const allowed = await hasPermission(`create.${domain}`, context, options);
    if (allowed !== true) {
        throw {message: 'You have insufficient permission to this resource'}
    }
}

async function createMany(domain: string, ruleData,context: RuleContext,options: BFastOptions){
    return writeMany(
        domain, ruleData, false, context,
        {bypassDomainVerification: context?.useMasterKey === true, transaction: null},
        options
    );
}
async function createOne(domain, ruleData, context: RuleContext, options: BFastOptions){
    return writeOne(
        domain, ruleData, false, context,
        {bypassDomainVerification: context?.useMasterKey === true, transaction: null},
        options
    );
}

export async function createRule(
    domain: string, ruleData, ruleResponse: RuleResponse, context: RuleContext, options: BFastOptions
) {
    await hasCreatePermission(domain, context, options);
    let result;
    if (ruleData && Array.isArray(ruleData)) {
        result = await createMany(domain, ruleData, context, options);
    } else {
        result = await createOne(domain, ruleData, context, options);
    }
    ruleResponse[`create${domain}`] = result;
}