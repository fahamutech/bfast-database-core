import {RuleContext} from "../../models/rule-context";
import {BFastOptions} from "../../bfast-option";
import {PolicyData} from "../../models/policy";
import {validateInput} from "../index";
import {StringSchema} from "../../models/string";
import {DatabaseAdapter} from "../../adapters/database";
import {findDataByFilterInStore} from "../database/query";
import {removeDataInStore} from "../database/remove";

export const policyDomainName = '_Policy';

export function sanitizePolicy4User(_p1: PolicyData) {
    if (_p1.id) _p1.id = decodeDot(_p1.id.replace('%id', ''));
    if (_p1.ruleId) _p1.ruleId = decodeDot(_p1.ruleId);
    if (_p1.ruleBody) _p1.ruleBody = decodeDot(_p1.ruleBody);
    return _p1;
}

function decodeDot(data: string) {
    return data.replace(new RegExp('%+', 'ig'), '.');
}

export async function removePolicyRule(
    ruleId: string, context: RuleContext, databaseAdapter: DatabaseAdapter, options: BFastOptions
) {
    await validateInput(ruleId, StringSchema, 'invalid rule id');
    const deleteModel = {
        filter: {
            ruleId: ruleId.replace('.', '%'),
        },
        return: ['id'],
    };
    const wOptions = {bypassDomainVerification: true};
    const _y89 = await removeDataInStore('_Policy', deleteModel, context, databaseAdapter, wOptions, options);
    return _y89.map(z => sanitizePolicy4User(z));
}

function getGlobalRule(ruleId: string) {
    const ruleIdInArray = ruleId.split('.')
    if (ruleIdInArray.length >= 2) {
        ruleIdInArray[1] = '*';
        const globalRule = ruleIdInArray.join('.');
        return {ruleId: globalRule.replace('.', '%')}
    }
    return null
}

export async function ruleHasPermission(
    ruleId: string, context: RuleContext, databaseAdapter: DatabaseAdapter, options: BFastOptions
): Promise<boolean> {
    await validateInput(ruleId, StringSchema, 'invalid rule id')
    if (context && context?.useMasterKey === true) return true
    const filter = []
    const originalRule = {ruleId: ruleId.replace('.', '%')}
    const globalRule = getGlobalRule(ruleId)
    if (globalRule) filter.push(globalRule)
    filter.push(originalRule)
    const queryModel = {return: [], filter: {$or: filter}}
    const wOptions = {bypassDomainVerification: true}
    let policies: any[] =
        await findDataByFilterInStore(policyDomainName, queryModel, context, databaseAdapter, wOptions, options)
    policies = policies.map(x => sanitizePolicy4User(x))
    if (policies.length === 0) return true
    const originalRuleResult = policies.filter(value => value.ruleId === decodeDot(originalRule.ruleId));
    if (originalRuleResult && originalRuleResult.length === 1 && originalRuleResult[0].ruleBody) {
        const execRule = new Function('context', originalRuleResult[0].ruleBody);
        return execRule(context) === true;
    }
    const globalRuleResult = policies.filter(value => value.ruleId === decodeDot(globalRule.ruleId));
    if (globalRuleResult && globalRuleResult.length === 1 && globalRuleResult[0].ruleBody) {
        const execRule = new Function('context', globalRuleResult[0].ruleBody);
        return execRule(context) === true;
    }
    return false;
}
