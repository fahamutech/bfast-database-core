import {DeleteModel} from '../models/delete-model';
import {BFastOptions} from '../bfast-option';
import {devLog} from "../utils/debug";
import {AuthAdapter} from "../adapters/auth.adapter";
import {FilesAdapter} from "../adapters/files.adapter";
import {aggregate, bulk, findByFilter, findById, removeDataInStore} from "./database.controller";
import {deleteFile, listFiles, saveFile} from "./storage";
import {Rules} from "../models/rules";
import {RuleResponse} from "../models/rule-response";
import {AuthRule} from "../models/auth-rule";
import {authRule} from "./rules-auth";
import {policyRule} from "./rules-policy";
import {createRule} from "./rules-create";
import {updateRule} from "./rules-update";
import {ruleHasPermission} from "./policy";
import {handleDeleteRule} from "./rules-delete";

export function getRulesKey(rules: Rules): string[] {
    if (rules) {
        return Object.keys(rules);
    }
    return Object.keys({});
}

async function withRuleResponse(
    errorPath: string, ruleResponse: RuleResponse, fun: () => Promise<RuleResponse>
): Promise<RuleResponse> {
    try {
        return fun()
    } catch (e) {
        devLog(e);
        ruleResponse.errors[errorPath] = {
            message: e.message ? e.message : e.toString(),
        };
        return ruleResponse
    }
}

export async function handleAuthenticationRule(
    rules: Rules, ruleResponse: RuleResponse, authAdapter: AuthAdapter, options: BFastOptions,
): Promise<RuleResponse> {
    const authRulesNames: string[] = getRulesKey(rules).filter(rule => rule.startsWith('auth'));
    if (authRulesNames.length === 0) return ruleResponse
    const rule: AuthRule = rules[authRulesNames[0]];
    for (const action of Object.keys(rule)) {
        const data = rule[action];
        ruleResponse = await withRuleResponse(`auth.${action}`, ruleResponse, () => {
            return authRule(action, data, ruleResponse, authAdapter, rules.context, options);
        });
    }
    return ruleResponse;
}

export async function handlePolicyRule(
    rules: Rules, ruleResponse: RuleResponse, options: BFastOptions,
): Promise<RuleResponse> {
    const policyRules = getRulesKey(rules).filter(rule => rule.startsWith('policy'));
    if (policyRules.length === 0) return ruleResponse
    const policy = rules[policyRules[0]];
    for (const action of Object.keys(policy)) {
        const data = policy[action];
        ruleResponse = await withRuleResponse('policy', ruleResponse, () => {
            return policyRule(action, data, ruleResponse, rules.context, options);
        });
    }
    return ruleResponse;
}

export async function handleDeleteRules(
    rules: Rules, ruleResponse: RuleResponse, options: BFastOptions, transaction: any
): Promise<RuleResponse> {
    const deleteRules = getRulesKey(rules).filter(rule => rule.startsWith('delete'));
    if (deleteRules.length === 0) return ruleResponse
    for (const rule of deleteRules) {
        const domain = extractDomain(rule, 'delete');
        const ePath = `${transaction ? 'transaction.' : ''}delete.${domain}`;
        ruleResponse = await withRuleResponse(ePath, ruleResponse, () => {
            const ruleData = rules[rule]
            return handleDeleteRule(domain, ruleData, ruleResponse, rules.context, options)
        })
    }
    return ruleResponse;
}

export async function handleQueryRules(
    rulesBlockModel: Rules,
    ruleResultModel: RuleResponse,
    options: BFastOptions,
    transactionSession: any
): Promise<RuleResponse> {
    try {
        const queryRules = getRulesKey(rulesBlockModel).filter(rule => rule.startsWith('query'));
        if (queryRules.length === 0) {
            return ruleResultModel;
        }
        for (const queryRule of queryRules) {
            const domain = extractDomain(queryRule, 'query');
            const rulesBlockModelElement = rulesBlockModel[queryRule];
            const allowed = await ruleHasPermission(
                `query.${domain}`,
                rulesBlockModel?.context,
                options
            );
            if (allowed !== true) {
                ruleResultModel.errors[`${transactionSession ? 'transactionSession.' : ''}query.${domain}`] = {
                    message: 'You have insufficient permission to this resource',
                };
                return ruleResultModel;
            }
            try {
                if (rulesBlockModelElement && Array.isArray(rulesBlockModelElement)) {
                    ruleResultModel.errors[queryRule] = {
                        message: 'query data must be a map',
                        // path: queryRule,
                        // data: rulesBlockModelElement,
                    };
                } else {
                    if (rulesBlockModelElement.hasOwnProperty('id')) {
                        rulesBlockModelElement._id = rulesBlockModelElement.id;
                        ruleResultModel[queryRule] = await findById(
                            domain,
                            rulesBlockModelElement,
                            {
                                bypassDomainVerification: rulesBlockModel?.context?.useMasterKey === true,
                                transaction: transactionSession
                            },
                            options
                        );
                    } else if (rulesBlockModelElement.hasOwnProperty('_id')) {
                        delete rulesBlockModelElement.id;
                        ruleResultModel[queryRule] = await findById(
                            domain,
                            rulesBlockModelElement,
                            {
                                bypassDomainVerification: rulesBlockModel?.context?.useMasterKey === true,
                                transaction: transactionSession
                            },
                            options
                        );
                    } else {
                        ruleResultModel[queryRule] = await findByFilter(
                            domain,
                            rulesBlockModelElement,
                            rulesBlockModel?.context,
                            {
                                bypassDomainVerification: rulesBlockModel?.context?.useMasterKey === true,
                                transaction: transactionSession
                            },
                            options
                        );
                    }
                }
            } catch (e) {
                devLog(e);
                ruleResultModel.errors[`${transactionSession ? 'transactionSession.' : ''}query.${domain}`] = {
                    message: e.message ? e.message : e.toString(),
                };
                if (transactionSession) {
                    throw e;
                }
            }
        }
        return ruleResultModel;
    } catch (e) {
        devLog(e);
        ruleResultModel.errors[`${transactionSession ? 'transactionSession.' : ''}query`] = {
            message: e.message ? e.message : e.toString(),
        };
        if (transactionSession) {
            throw e;
        }
        return ruleResultModel;
    }
}

export async function handleBulkRule(
    rulesBlockModel: Rules, ruleResultModel: RuleResponse, options: BFastOptions,
): Promise<RuleResponse> {
    try {
        const transactionRules = getRulesKey(rulesBlockModel).filter(rule => rule.startsWith('transaction'));
        if (transactionRules.length === 0) {
            return ruleResultModel;
        }
        const transactionRule = transactionRules[0];
        const transaction = rulesBlockModel[transactionRule];
        const transactionOperationRules = transaction.commit;
        const resultObject: RuleResponse = {errors: {}};
        await bulk(async session => {
            await handleCreateRules(
                transactionOperationRules,
                resultObject,
                options,
                session
            );
            await handleUpdateRules(
                transactionOperationRules,
                resultObject,
                options,
                session
            );
            await handleQueryRules(
                transactionOperationRules,
                resultObject,
                options,
                session
            );
            await handleDeleteRules(
                transactionOperationRules,
                resultObject,
                options,
                session
            );
        });
        ruleResultModel.transaction = {
            commit: {
                errors: resultObject.errors
            }
        };
        return ruleResultModel;
    } catch (e) {
        devLog(e);
        ruleResultModel.errors.transaction = {
            message: e.message ? e.message : e.toString(),
        };
        return ruleResultModel;
    }
}

export async function handleCreateRules(
    rules: Rules, ruleResponse: RuleResponse, options: BFastOptions, transactionSession: any
): Promise<RuleResponse> {
    const createRules = getRulesKey(rules).filter(rule => rule.startsWith('create'));
    if (createRules.length === 0) {
        return ruleResponse;
    }
    for (const rule of createRules) {
        const domain = extractDomain(rule, 'create');
        const ePath = `${transactionSession ? 'transaction.' : ''}create.${domain}`;
        ruleResponse = await withRuleResponse(ePath, ruleResponse, () => {
            const ruleData = rules[rule];
            return createRule(domain, ruleData, ruleResponse, rules.context, options);
        });
    }
    return ruleResponse;
}

export async function handleUpdateRules(
    rules: Rules,
    ruleResponse: RuleResponse,
    options: BFastOptions,
    transactionSession: any
): Promise<RuleResponse> {
    const updateRules = getRulesKey(rules).filter(rule => rule.startsWith('update'));
    if (updateRules.length === 0) {
        return ruleResponse;
    }
    for (const rule of updateRules) {
        const domain = extractDomain(rule, 'update');
        const ePath = `${transactionSession ? 'transaction.' : ''}update.${domain}`;
        ruleResponse = await withRuleResponse(ePath, ruleResponse, () => {
            const ruleData = rules[rule];
            return updateRule(domain, ruleData, ruleResponse, rules.context, options);
        })
    }
    return ruleResponse;
}

export async function handleStorageRule(
    rulesBlockModel: Rules, ruleResultModel: RuleResponse,
    authAdapter: AuthAdapter, filesAdapter: FilesAdapter, options: BFastOptions,
): Promise<RuleResponse> {
    try {
        const fileRules = getRulesKey(rulesBlockModel).filter(rule => rule.startsWith('files'));
        if (fileRules.length === 0) {
            return ruleResultModel;
        }
        const fileRule = fileRules[0];
        const file = rulesBlockModel[fileRule];
        for (const action of Object.keys(file)) {
            const data = file[action];
            try {
                if (action === 'save') {
                    const allowed = await ruleHasPermission(
                        `files.save`,
                        rulesBlockModel.context,
                        options
                    );
                    if (allowed !== true) {
                        ruleResultModel.errors[`files.save`] = {
                            message: 'You have insufficient permission to save file'
                        };
                    } else {
                        ruleResultModel.files = {};
                        ruleResultModel.files.save = await saveFile(
                            data,
                            rulesBlockModel.context,
                            filesAdapter,
                            options
                        );
                    }
                } else if (action === 'delete') {
                    const allowed = await ruleHasPermission(
                        `files.delete`,
                        rulesBlockModel.context,
                        options
                    );
                    if (allowed !== true) {
                        ruleResultModel.errors[`files.delete`] = {
                            message: 'You have insufficient permission delete file'
                        };
                    } else {
                        ruleResultModel.files = {};
                        ruleResultModel.files.delete = await deleteFile(
                            data,
                            rulesBlockModel.context,
                            filesAdapter,
                            options
                        );
                    }
                } else if (action === 'list') {
                    const allowed = await ruleHasPermission(
                        `files.list`,
                        rulesBlockModel.context,
                        options
                    );
                    if (allowed !== true) {
                        ruleResultModel.errors[`files.list`] = {
                            message: 'You have insufficient permission list files'
                        };
                    } else {
                        ruleResultModel.files = {};
                        ruleResultModel.files.list = await listFiles({
                                prefix: data && data.prefix ? data.prefix : '',
                                size: data && data.size ? data.size : 20,
                                after: data.after,
                                skip: data && data.skip ? data.skip : 0
                            },
                            filesAdapter,
                            options
                        );
                    }
                }
            } catch (e) {
                devLog(e);
                ruleResultModel.errors[`files.${action}`] = {
                    message: e.message ? e.message : e.toString(),
                };
            }
        }
        return ruleResultModel;
    } catch (e) {
        devLog(e);
        ruleResultModel.errors.files = {
            message: e.message ? e.message : e.toString(),
        };
        return ruleResultModel;
    }
}

export async function handleAggregationRules(
    rulesBlockModel: Rules, ruleResultModel: RuleResponse, options: BFastOptions
): Promise<RuleResponse> {
    try {
        const aggregateRules = getRulesKey(rulesBlockModel).filter(rule => rule.startsWith('aggregate'));
        if (aggregateRules.length === 0) {
            return ruleResultModel;
        }
        for (const aggregateRule of aggregateRules) {
            const domain = extractDomain(aggregateRule, 'aggregate');
            const allowed = await ruleHasPermission(`aggregate.${domain}`, rulesBlockModel?.context, options);
            if (allowed !== true) {
                ruleResultModel.errors[`aggregate.${domain}`] = {
                    message: 'You have insufficient permission to this resource',
                };
                return ruleResultModel;
            }
            const data = rulesBlockModel[aggregateRule];
            try {
                if (data
                    && data.hashes
                    && data.pipelines
                    && Array.isArray(data.pipelines)
                    && Array.isArray(data.hashes)
                ) {
                    ruleResultModel[aggregateRule] = await aggregate(
                        domain,
                        data.pipelines,
                        {bypassDomainVerification: true, transaction: null},
                        options
                    );
                } else if (data && Array.isArray(data)) {
                    ruleResultModel[aggregateRule] = await aggregate(
                        domain,
                        data,
                        {bypassDomainVerification: true, transaction: null},
                        options
                    );
                } else {
                    throw {message: 'A pipeline must be of any[] or {hashes:string[],pipelines: any[]}'};
                }
            } catch (e) {
                devLog(e);
                ruleResultModel.errors[`aggregate.${domain}`] = {
                    message: e.message ? e.message : e.toString(),
                };
            }
        }
        return ruleResultModel;
    } catch (e) {
        devLog(e);
        ruleResultModel.errors[`aggregate`] = {
            message: e.message ? e.message : e.toString(),
        };
        return ruleResultModel;
    }
}

export function extractDomain(
    rule: string,
    remove: 'create' | 'query' | 'update' | 'delete' | 'index' | 'aggregate'
): string {
    if ((remove === 'create' || remove === 'query' || remove === 'update' || remove === 'index'
        || remove === 'delete' || remove === 'aggregate') && rule.startsWith(remove)) {
        return rule.trim().replace(remove, '');
    } else {
        return null;
    }
}
