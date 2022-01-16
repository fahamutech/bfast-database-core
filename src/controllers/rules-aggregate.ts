import {RuleResponse} from "../models/rule-response";
import {BFastOptions} from "../bfast-option";
import {ruleHasPermission} from "./policy";
import {aggregateDataInStore} from "./database.controller";
import {RuleContext} from "../models/rule-context";

async function hasAggregatePermission(domain: string, context: RuleContext, options: BFastOptions) {
    const allowed = await ruleHasPermission(`aggregate.${domain}`, context, options);
    if (allowed !== true) throw {message: 'You have insufficient permission to this resource'}
}

export async function handleAggregateRule(
    domain: string, ruleData: any, ruleResponse: RuleResponse, context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    await hasAggregatePermission(domain, context, options)
    const wOptions = {bypassDomainVerification: true, transaction: null}
    if (ruleData && ruleData.pipelines && Array.isArray(ruleData.pipelines)) {
        ruleResponse[`aggregate${domain}`] = await aggregateDataInStore(domain, ruleData.pipelines, wOptions, options);
    } else if (ruleData && Array.isArray(ruleData)) {
        ruleResponse[`aggregate${domain}`] = await aggregateDataInStore(domain, ruleData, wOptions, options);
    } else throw {message: 'A pipeline must be of any[] or {hashes:string[],pipelines: any[]}'}
    return ruleResponse
}