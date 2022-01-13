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

async function policyAdd(data, ruleResponse: RuleResponse, context: RuleContext, options: BFastOptions) {
    const authorizationResults = {};
    for (const rule of Object.keys(data)) {
        authorizationResults[rule] = await addPolicyRule(rule, data[rule], context, options);
    }
    ruleResponse = sanitizeRuleResponse(ruleResponse);
    ruleResponse.policy.add = authorizationResults;
}

async function policyList(ruleResponse: RuleResponse, context: RuleContext, options: BFastOptions) {
    const listResponse = await listPolicyRule(context, options);
    ruleResponse = sanitizeRuleResponse(ruleResponse);
    ruleResponse.policy.list = listResponse
}

async function policyRemove(data, ruleResponse: RuleResponse, context: RuleContext, options: BFastOptions) {
    const removeResponse = await removePolicyRule(data.ruleId, context, options);
    ruleResponse = sanitizeRuleResponse(ruleResponse);
    ruleResponse.policy.remove = removeResponse;
}

export async function policyRule(
    action: string, data: any, ruleResponse: RuleResponse, context: RuleContext, options: BFastOptions
) {
    if (!(context && context.useMasterKey === true)) {
        throw {message: 'policy rule require masterKey'}
    }
    if (action === 'add' && typeof data === 'object') {
        await policyAdd(data, ruleResponse, context, options)
    } else if (action === 'list' && typeof data === 'object') {
        await policyList(ruleResponse, context, options);
    } else if (action === 'remove' && typeof data === 'object') {
        await policyRemove(data, ruleResponse, context, options);
    }
}