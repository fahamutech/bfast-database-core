import {RuleResponse} from "../../models/rule-response";
import {BFastOptions} from "../../bfast-option";
import {RuleContext} from "../../models/rule-context";
import {DatabaseAdapter} from "../../adapters/database";
import {addPolicyRule} from "../policy/add";
import {listPolicyRule} from "../policy/list";
import {removePolicyRule} from "../policy/remove";

function sanitizeRuleResponse(ruleResponse: RuleResponse) {
    if (!ruleResponse.policy) {
        ruleResponse.policy = {};
    }
    return ruleResponse;
}

async function policyAdd(
    data, ruleResponse: RuleResponse,databaseAdapter: DatabaseAdapter,
    context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    const authorizationResults = {};
    for (const rule of Object.keys(data)) {
        authorizationResults[rule] = await addPolicyRule(rule, data[rule],databaseAdapter, context, options);
    }
    ruleResponse = sanitizeRuleResponse(ruleResponse);
    ruleResponse.policy.add = authorizationResults;
    return ruleResponse
}

async function policyList(
    ruleResponse: RuleResponse,databaseAdapter: DatabaseAdapter,
    context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    const listResponse = await listPolicyRule(databaseAdapter,context, options);
    ruleResponse = sanitizeRuleResponse(ruleResponse);
    ruleResponse.policy.list = listResponse
    return ruleResponse
}

async function policyRemove(
    data, ruleResponse: RuleResponse,databaseAdapter: DatabaseAdapter,
    context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    const removeResponse = await removePolicyRule(data.ruleId, context, databaseAdapter, options);
    ruleResponse = sanitizeRuleResponse(ruleResponse);
    ruleResponse.policy.remove = removeResponse;
    return ruleResponse
}

export async function policyRule(
    action: string, data: any, ruleResponse: RuleResponse, databaseAdapter: DatabaseAdapter,
    context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    if (!(context && context.useMasterKey === true)) {
        throw {message: 'policy rule require masterKey'}
    }
    if (action === 'add' && typeof data === 'object') {
        return await policyAdd(data, ruleResponse, databaseAdapter, context, options)
    } else if (action === 'list' && typeof data === 'object') {
        return await policyList(ruleResponse, databaseAdapter, context, options);
    } else if (action === 'remove' && typeof data === 'object') {
        return await policyRemove(data, ruleResponse, databaseAdapter, context, options);
    } else return ruleResponse
}
