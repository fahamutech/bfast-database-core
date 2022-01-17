import {BFastOptions} from '../bfast-option';
import {devLog} from "../utils/debug";
import {AuthAdapter} from "../adapters/auth";
import {FilesAdapter} from "../adapters/files";
import {transaction} from "./database";
import {Rules} from "../models/rules";
import {RuleResponse} from "../models/rule-response";
import {AuthRule} from "../models/auth-rule";
import {authRule} from "./rules-auth";
import {policyRule} from "./rules-policy";
import {createRule} from "./rules-create";
import {updateRule} from "./rules-update";
import {handleDeleteRule} from "./rules-delete";
import {handleQueryRule} from "./rules-query";
import {handleStorageRule} from "./rules-storage";
import {handleAggregateRule} from "./rules-aggregate";
import {DatabaseAdapter} from "../adapters/database";

export function getRulesKey(rules: Rules): string[] {
    const defaultKeys = []
    try {
        if (typeof rules === 'object') return Object.keys(rules)
        return defaultKeys
    } catch (e) {
        return defaultKeys
    }
}

async function withRuleResponse(
    errorPath: string, ruleResponse: RuleResponse, fun: () => Promise<RuleResponse>
): Promise<RuleResponse> {
    try {return await fun()} catch (e) {
        devLog(e);
        ruleResponse.errors[errorPath] = {
            message: e.message ? e.message : e.toString(),
        };
        return ruleResponse
    }
}

export async function handleAuthenticationRule(
    rules: Rules, ruleResponse: RuleResponse, authAdapter: AuthAdapter,
    databaseAdapter: DatabaseAdapter, options: BFastOptions,
): Promise<RuleResponse> {
    const authRulesNames: string[] = getRulesKey(rules).filter(rule => rule.startsWith('auth'));
    if (authRulesNames.length === 0) return ruleResponse
    const rule: AuthRule = rules[authRulesNames[0]];
    for (const action of Object.keys(rule)) {
        const data = rule[action];
        ruleResponse = await withRuleResponse(`auth.${action}`, ruleResponse,
            () => authRule(action, data, ruleResponse, authAdapter, databaseAdapter, rules.context, options));
    }
    return ruleResponse;
}

export async function handlePolicyRule(
    rules: Rules, ruleResponse: RuleResponse, databaseAdapter: DatabaseAdapter, options: BFastOptions,
): Promise<RuleResponse> {
    const policyRules = getRulesKey(rules).filter(rule => rule.startsWith('policy'));
    if (policyRules.length === 0) return ruleResponse
    const policy = rules[policyRules[0]];
    for (const action of Object.keys(policy)) {
        const data = policy[action];
        ruleResponse = await withRuleResponse('policy', ruleResponse,
            () => policyRule(action, data, ruleResponse, databaseAdapter, rules.context, options));
    }
    return ruleResponse;
}

export async function handleDeleteRules(
    rules: Rules, ruleResponse: RuleResponse,
    databaseAdapter: DatabaseAdapter, options: BFastOptions, transaction: any
): Promise<RuleResponse> {
    const deleteRules = getRulesKey(rules).filter(rule => rule.startsWith('delete'));
    if (deleteRules.length === 0) return ruleResponse
    for (const rule of deleteRules) {
        const domain = extractDomain(rule, 'delete');
        const ePath = `${transaction ? 'transaction.' : ''}delete.${domain}`;
        const ruleData = rules[rule]
        ruleResponse = await withRuleResponse(ePath, ruleResponse,
            () => handleDeleteRule(domain, ruleData, ruleResponse, databaseAdapter, rules.context, options))
    }
    return ruleResponse;
}

export async function handleQueryRules(
    rules: Rules, ruleResponse: RuleResponse, databaseAdapter: DatabaseAdapter, options: BFastOptions, transaction: any
): Promise<RuleResponse> {
    const queryRules = getRulesKey(rules).filter(rule => rule.startsWith('query'));
    if (queryRules.length === 0) return ruleResponse
    for (const queryRule of queryRules) {
        const domain = extractDomain(queryRule, 'query');
        const ePath = `${transaction ? 'transaction.' : ''}query.${domain}`;
        const ruleData = rules[queryRule]
        ruleResponse = await withRuleResponse(ePath, ruleResponse,
            () => handleQueryRule(domain, ruleData, ruleResponse, databaseAdapter, rules.context, options))
    }
    return ruleResponse;
}

export async function handleBulkRules(
    rules: Rules, ruleResponse: RuleResponse,databaseAdapter: DatabaseAdapter, options: BFastOptions,
): Promise<RuleResponse> {
    const transactionRules = getRulesKey(rules).filter(rule => rule === 'transaction');
    if (transactionRules.length === 0) return ruleResponse
    const transactionRule = transactionRules[0];
    const transactionData = rules[transactionRule];
    const transactionOperationRules = transactionData.commit;
    const resultObject: RuleResponse = {errors: {}};
    await transaction(databaseAdapter, async session => {
        await handleCreateRules(transactionOperationRules, resultObject, databaseAdapter, options, session);
        await handleUpdateRules(transactionOperationRules, resultObject, databaseAdapter, options, session);
        await handleQueryRules(transactionOperationRules, resultObject, databaseAdapter, options, session);
        await handleDeleteRules(transactionOperationRules, resultObject, databaseAdapter, options, session);
    });
    ruleResponse.transaction = {commit: {errors: resultObject.errors}};
    return ruleResponse;
}

export async function handleCreateRules(
    rules: Rules, ruleResponse: RuleResponse, databaseAdapter: DatabaseAdapter,
    options: BFastOptions, transactionSession: any
): Promise<RuleResponse> {
    const createRules = getRulesKey(rules).filter(rule => rule.startsWith('create'));
    if (createRules.length === 0) return ruleResponse
    for (const rule of createRules) {
        const domain = extractDomain(rule, 'create');
        const ePath = `${transactionSession ? 'transaction.' : ''}create.${domain}`;
        const ruleData = rules[rule];
        ruleResponse = await withRuleResponse(ePath, ruleResponse,
            () => createRule(domain, ruleData, ruleResponse, databaseAdapter, rules.context, options)
        );
    }
    return ruleResponse;
}

export async function handleUpdateRules(
    rules: Rules, ruleResponse: RuleResponse, databaseAdapter: DatabaseAdapter,
    options: BFastOptions, transaction: any
): Promise<RuleResponse> {
    const updateRules = getRulesKey(rules).filter(rule => rule.startsWith('update'));
    if (updateRules.length === 0) return ruleResponse
    for (const rule of updateRules) {
        const domain = extractDomain(rule, 'update');
        const ePath = `${transaction ? 'transaction.' : ''}update.${domain}`;
        const ruleData = rules[rule];
        ruleResponse = await withRuleResponse(ePath, ruleResponse,
            () => updateRule(domain, ruleData, ruleResponse, databaseAdapter, rules.context, options))
    }
    return ruleResponse;
}

export async function handleStorageRules(
    rules: Rules, ruleResponse: RuleResponse, databaseAdapter: DatabaseAdapter,
    authAdapter: AuthAdapter, filesAdapter: FilesAdapter, options: BFastOptions,
): Promise<RuleResponse> {
    const fileRules = getRulesKey(rules).filter(rule => rule === 'files');
    if (fileRules.length === 0) return ruleResponse
    const fileRule = fileRules[0];
    const ePath = 'files';
    const ruleData = rules[fileRule]
    return withRuleResponse(ePath, ruleResponse,
        () => handleStorageRule(ruleData, ruleResponse, filesAdapter, databaseAdapter, rules.context, options)
    )
}

export async function handleAggregationRules(
    rules: Rules, ruleResponse: RuleResponse, databaseAdapter: DatabaseAdapter, options: BFastOptions
): Promise<RuleResponse> {
    const aggregateRules = getRulesKey(rules).filter(rule => rule.startsWith('aggregate'));
    if (aggregateRules.length === 0) return ruleResponse
    for (const aggregateRule of aggregateRules) {
        const domain = extractDomain(aggregateRule, 'aggregate');
        const ePath = `aggregate.${domain}`;
        const ruleData = rules[aggregateRule]
        ruleResponse = await withRuleResponse(ePath, ruleResponse,
            () => handleAggregateRule(domain, ruleData, ruleResponse, databaseAdapter, rules.context, options)
        )
    }
    return ruleResponse;
}

export function extractDomain(
    rule: string,
    remove: 'create' | 'query' | 'update' | 'delete' | 'index' | 'aggregate'
): string {
    if ((remove === 'create' || remove === 'query' || remove === 'update' || remove === 'index'
        || remove === 'delete' || remove === 'aggregate') && rule.startsWith(remove)
    ) return rule.trim().replace(remove, '')
    else return null
}
