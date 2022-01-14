import {RuleResponse} from "../models/rule-response";
import {BFastOptions} from "../bfast-option";
import {RuleContext} from "../models/rule-context";
import {addPolicyRule, listPolicyRule, removePolicyRule} from "./policy";

function sanitizeRuleResponse(ruleResponse: RuleResponse) {
    if (!ruleResponse.policy) {
        ruleResponse.policy = {};
    }
    return ruleResponse;
}

async function policyAdd(
    data, ruleResponse: RuleResponse, context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    const authorizationResults = {};
    for (const rule of Object.keys(data)) {
        authorizationResults[rule] = await addPolicyRule(rule, data[rule], context, options);
    }
    ruleResponse = sanitizeRuleResponse(ruleResponse);
    ruleResponse.policy.add = authorizationResults;
    return ruleResponse
}

async function policyList(
    ruleResponse: RuleResponse, context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    const listResponse = await listPolicyRule(context, options);
    ruleResponse = sanitizeRuleResponse(ruleResponse);
    ruleResponse.policy.list = listResponse
    return ruleResponse
}

async function policyRemove(
    data, ruleResponse: RuleResponse, context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    const removeResponse = await removePolicyRule(data.ruleId, context, options);
    ruleResponse = sanitizeRuleResponse(ruleResponse);
    ruleResponse.policy.remove = removeResponse;
    return ruleResponse
}

export async function policyRule(
    action: string, data: any, ruleResponse: RuleResponse, context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    if (!(context && context.useMasterKey === true)) {
        throw {message: 'policy rule require masterKey'}
    }
    if (action === 'add' && typeof data === 'object') {
        return await policyAdd(data, ruleResponse, context, options)
    } else if (action === 'list' && typeof data === 'object') {
        return await policyList(ruleResponse, context, options);
    } else if (action === 'remove' && typeof data === 'object') {
        return await policyRemove(data, ruleResponse, context, options);
    } else return ruleResponse
}