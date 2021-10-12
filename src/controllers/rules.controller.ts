import {RuleResponse, RulesModel} from '../model/rules.model';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {DeleteModel} from '../model/delete-model';
import {AuthController} from './auth.controller';
import {StorageController} from './storage.controller';
import {UpdateRuleController} from './update.rule.controller';
import {BFastOptions} from '../bfast-database.option';
import {devLog} from "../utils/debug.util";
import {SecurityController} from "./security.controller";
import {AuthAdapter} from "../adapters/auth.adapter";
import {FilesAdapter} from "../adapters/files.adapter";
import {bulk, findByFilter, remove, writeMany, writeOne} from "./database.controller";
import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn,
    PurgeNodeFn,
    PurgeNodeValueFn,
    UpsertDataFn,
    UpsertNodeFn
} from "../adapters/database.adapter";

export class RulesController {

    constructor() {
    }

    getRulesKey(rules: RulesModel): string[] {
        if (rules) {
            return Object.keys(rules);
        }
        return Object.keys({});
    }

    async handleAuthenticationRule(
        rules: RulesModel,
        ruleResponse: RuleResponse,
        authController: AuthController,
        securityController: SecurityController,
        authAdapter: AuthAdapter,
        purgeNodeValue: PurgeNodeValueFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        options: BFastOptions,
    ): Promise<RuleResponse> {
        try {
            return this.processAuthenticationBlock(
                ruleResponse,
                rules,
                authController,
                securityController,
                authAdapter,
                purgeNodeValue,
                getNodes,
                getNode,
                getDataInStore,
                upsertNode,
                upsertDataInStore,
                options
            );
        } catch (e) {
            ruleResponse.errors.auth = {
                message: e.message ? e.message : e.toString(),
                path: 'auth',
                data: null
            };
            return ruleResponse;
        }
    }

    private async processAuthenticationBlock(
        ruleResponse: RuleResponse,
        rules: RulesModel,
        authController: AuthController,
        securityController: SecurityController,
        authAdapter: AuthAdapter,
        purgeNodeValue: PurgeNodeValueFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        options: BFastOptions,
    ) {
        const authenticationRules = this.getRulesKey(rules).filter(rule => rule.startsWith('auth'));
        if (authenticationRules.length === 0) {
            return ruleResponse;
        }
        const authenticationRule = authenticationRules[0];
        const authRule = rules[authenticationRule];
        for (const action of Object.keys(authRule)) {
            const data = authRule[action];
            try {
                if (action === 'signUp') {
                    const signUpResponse = await authController.signUp(
                        data,
                        securityController,
                        authAdapter,
                        rules.context,
                        purgeNodeValue,
                        getNodes,
                        getNode,
                        getDataInStore,
                        upsertNode,
                        upsertDataInStore,
                        options
                    );
                    ruleResponse.auth = {};
                    ruleResponse.auth.signUp = signUpResponse;
                } else if (action === 'signIn') {
                    const signInResponse = await authController.signIn(
                        data,
                        securityController,
                        authAdapter,
                        rules.context,
                        purgeNodeValue,
                        getNodes,
                        getNode,
                        getDataInStore,
                        options
                    );
                    ruleResponse.auth = {};
                    ruleResponse.auth.signIn = signInResponse;
                } else if (action === 'reset') {
                    throw {message: 'Reset not supported yet'};
                    // ruleResponse.auth = {};
                    // ruleResponse.auth.resetPassword = await this.authController.resetPassword(data.email ? data.email : data);
                }
            } catch (e) {
                console.log(e.toString());
                ruleResponse.errors[`auth.${action}`] = {
                    message: e.message ? e.message : e.toString(),
                    path: `auth.${action}`,
                    data
                };
            }
        }
        return ruleResponse;
    }

    async handleAuthorizationRule(
        rules: RulesModel,
        ruleResponse: RuleResponse,
        authController: AuthController,
        securityController: SecurityController,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        purgeNodeValue: PurgeNodeValueFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        purgeNode: PurgeNodeFn,
        options: BFastOptions,
    ): Promise<RuleResponse> {
        try {
            const policyRules = this.getRulesKey(rules).filter(rule => rule.startsWith('policy'));
            if (policyRules.length === 0) {
                return ruleResponse;
            }
            if (!(rules.context && rules.context.useMasterKey === true)) {
                ruleResponse.errors.policy = {
                    message: 'policy rule require masterKey',
                    path: 'policy',
                    data: null
                };
                return ruleResponse;
            }
            const authorizationRule = policyRules[0];
            const policy = rules[authorizationRule];
            for (const action of Object.keys(policy)) {
                const data = policy[action];
                try {
                    if (action === 'add' && typeof data === 'object') {
                        const authorizationResults = {};
                        for (const rule of Object.keys(data)) {
                            authorizationResults[rule] = await authController.addPolicyRule(
                                rule,
                                data[rule],
                                securityController,
                                rules.context,
                                upsertNode,
                                upsertDataInStore,
                                options
                            );
                        }
                        ruleResponse.policy = {};
                        ruleResponse.policy[action] = authorizationResults;
                    } else if (action === 'list' && typeof data === 'object') {
                        const listResponse = await authController.listPolicyRule(
                            securityController,
                            rules.context,
                            purgeNodeValue,
                            getNodes,
                            getNode,
                            getDataInStore,
                            options
                        );
                        ruleResponse.policy = {};
                        ruleResponse.policy[action] = listResponse
                    } else if (action === 'remove' && typeof data === 'object') {
                        const removeResponse = await authController.removePolicyRule(
                            data.ruleId,
                            securityController,
                            rules.context,
                            purgeNodeValue,
                            getNodes,
                            getNode,
                            getDataInStore,
                            purgeNode,
                            options
                        );
                        ruleResponse.policy = {};
                        ruleResponse.policy[action] = removeResponse;
                    }
                } catch (e) {
                    devLog(e);
                    ruleResponse.errors[`policy.${action}`] = {
                        message: e.message ? e.message : e.toString(),
                        path: `policy.${action}`,
                        data
                    };
                }
            }
            return ruleResponse;
        } catch (e) {
            devLog(e);
            ruleResponse.errors.policy = {
                message: e.message ? e.message : e.toString(),
                path: 'policy',
                data: null
            };
            return ruleResponse;
        }
    }

    async handleCreateRules(
        rules: RulesModel,
        ruleResponse: RuleResponse,
        authController: AuthController,
        securityController: SecurityController,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        purgeNodeValue: PurgeNodeValueFn,
        options: BFastOptions,
        transactionSession: any
    ): Promise<RuleResponse> {
        try {
            const createRules = this.getRulesKey(rules).filter(rule => rule.startsWith('create'));
            if (createRules.length === 0) {
                return ruleResponse;
            }
            for (const createRule of createRules) {
                const domain = this.extractDomain(createRule, 'create');
                const createRuleRequest = rules[createRule];
                const allowed = await authController.hasPermission(
                    `create.${domain}`,
                    securityController,
                    rules?.context,
                    purgeNodeValue,
                    getNodes,
                    getNode,
                    getDataInStore,
                    options
                );
                if (allowed !== true) {
                    ruleResponse.errors[`${transactionSession ? 'transaction.' : ''}create.${domain}`] = {
                        message: 'You have insufficient permission to this resource',
                        path: `${transactionSession ? 'transaction.' : ''}create.${domain}`,
                        data: createRuleRequest
                    };
                    return ruleResponse;
                }
                try {
                    let result;
                    if (createRuleRequest && Array.isArray(createRuleRequest)) {
                        result = await writeMany(
                            domain,
                            createRuleRequest,
                            false,
                            upsertNode,
                            upsertDataInStore,
                            securityController,
                            rules?.context,
                            {
                                bypassDomainVerification: rules?.context?.useMasterKey === true,
                                transaction: transactionSession
                            },
                            options);
                    } else {
                        result = await writeOne(
                            domain,
                            createRuleRequest,
                            false,
                            upsertNode,
                            upsertDataInStore,
                            securityController,
                            rules?.context,
                            {
                                bypassDomainVerification: rules?.context?.useMasterKey === true,
                                transaction: transactionSession
                            },
                            options);
                    }
                    ruleResponse[createRule] = result;
                } catch (e) {
                    devLog(e);
                    ruleResponse.errors[`${transactionSession ? 'transaction.' : ''}create.${domain}`] = {
                        message: e.message ? e.message : e.toString(),
                        path: `${transactionSession ? 'transaction.' : ''}create.${domain}`,
                        data: createRuleRequest
                    };
                    if (transactionSession) {
                        throw e;
                    }
                }
            }
            return ruleResponse;
        } catch (e) {
            devLog(e);
            ruleResponse.errors[`${transactionSession ? 'transaction.' : ''}create`] = {
                message: e.message ? e.message : e.toString(),
                path: `${transactionSession ? 'transaction.' : ''}create`,
                data: null
            };
            if (transactionSession) {
                throw e;
            }
            return ruleResponse;
        }
    }

    async handleDeleteRules(
        rulesBlockModel: RulesModel,
        ruleResultModel: RuleResponse,
        authController: AuthController,
        securityController: SecurityController,
        purgeNodeValue: PurgeNodeValueFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        purgeNode: PurgeNodeFn,
        options: BFastOptions,
        transactionSession: any
    ): Promise<RuleResponse> {
        try {
            const deleteRules = this.getRulesKey(rulesBlockModel).filter(rule => rule.startsWith('delete'));
            if (deleteRules.length === 0) {
                return ruleResultModel;
            }
            for (const deleteRule of deleteRules) {
                const domain = this.extractDomain(deleteRule, 'delete');
                const rulesBlockModelElement: DeleteModel<any> = rulesBlockModel[deleteRule];
                const allowed = await authController.hasPermission(
                    `delete.${domain}`,
                    securityController,
                    rulesBlockModel?.context,
                    purgeNodeValue,
                    getNodes,
                    getNode,
                    getDataInStore,
                    options
                );
                if (allowed !== true) {
                    ruleResultModel.errors[`${transactionSession ? 'transaction.' : ''}delete.${domain}`] = {
                        message: 'You have insufficient permission to this resource',
                        path: `${transactionSession ? 'transaction.' : ''}delete.${domain}`,
                        data: rulesBlockModelElement
                    };
                    return ruleResultModel;
                }
                try {
                    if (rulesBlockModelElement?.id) {
                        const filter: any = {};
                        delete rulesBlockModelElement.filter;
                        filter._id = rulesBlockModelElement.id;
                        rulesBlockModelElement.filter = filter;
                        ruleResultModel[deleteRule] = await remove(
                            domain,
                            rulesBlockModelElement,
                            purgeNodeValue,
                            getNodes,
                            getNode,
                            getDataInStore,
                            purgeNode,
                            securityController,
                            rulesBlockModel?.context,
                            {
                                bypassDomainVerification: rulesBlockModel?.context?.useMasterKey === true,
                                transaction: transactionSession
                            },
                            options
                        );
                    } else {
                        if (!rulesBlockModelElement?.filter) {
                            throw new Error('filter field is required if you dont supply id field');
                        }
                        if (rulesBlockModelElement?.filter && Array.isArray(rulesBlockModelElement?.filter) && rulesBlockModelElement.filter.length === 0) {
                            throw new Error('Empty filter array is not supported in delete rule');
                        }
                        if (rulesBlockModelElement?.filter && Object.keys(rulesBlockModelElement?.filter).length === 0) {
                            throw new Error('Empty filter map is not supported in delete rule');
                        }
                        ruleResultModel[deleteRule] = await remove(
                            domain,
                            rulesBlockModelElement,
                            purgeNodeValue,
                            getNodes,
                            getNode,
                            getDataInStore,
                            purgeNode,
                            securityController,
                            rulesBlockModel?.context,
                            {
                                bypassDomainVerification: rulesBlockModel?.context?.useMasterKey === true,
                                transaction: transactionSession
                            },
                            options
                        );
                    }
                } catch (e) {
                    devLog(e);
                    ruleResultModel.errors[`${transactionSession ? 'transaction.' : ''}delete.${domain}`] = {
                        message: e.message ? e.message : e.toString(),
                        path: `${transactionSession ? 'transaction.' : ''}delete.${domain}`,
                        data: rulesBlockModelElement
                    };
                    if (transactionSession) {
                        throw e;
                    }
                }
            }
            return ruleResultModel;
        } catch (e) {
            devLog(e);
            ruleResultModel.errors[`${transactionSession ? 'transaction.' : ''}delete`] = {
                message: e.message ? e.message : e.toString(),
                path: `${transactionSession ? 'transaction.' : ''}delete`,
                data: null
            };
            if (transactionSession) {
                throw e;
            }
            return ruleResultModel;
        }
    }

    async handleQueryRules(
        rulesBlockModel: RulesModel,
        ruleResultModel: RuleResponse,
        authController: AuthController,
        securityController: SecurityController,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        purgeNodeValue: PurgeNodeValueFn,
        options: BFastOptions,
        transactionSession: any
    ): Promise<RuleResponse> {
        try {
            const queryRules = this.getRulesKey(rulesBlockModel).filter(rule => rule.startsWith('query'));
            if (queryRules.length === 0) {
                return ruleResultModel;
            }
            for (const queryRule of queryRules) {
                const domain = this.extractDomain(queryRule, 'query');
                const rulesBlockModelElement = rulesBlockModel[queryRule];
                const allowed = await authController.hasPermission(
                    `query.${domain}`,
                    securityController,
                    rulesBlockModel?.context,
                    purgeNodeValue,
                    getNodes,
                    getNode,
                    getDataInStore,
                    options
                );
                if (allowed !== true) {
                    ruleResultModel.errors[`${transactionSession ? 'transactionSession.' : ''}query.${domain}`] = {
                        message: 'You have insufficient permission to this resource',
                        path: `${transactionSession ? 'transactionSession.' : ''}query.${domain}`,
                        data: rulesBlockModelElement
                    };
                    return ruleResultModel;
                }
                try {
                    if (rulesBlockModelElement && Array.isArray(rulesBlockModelElement)) {
                        ruleResultModel.errors[queryRule] = {
                            message: 'query data must be a map',
                            path: queryRule,
                            data: rulesBlockModelElement,
                        };
                    } else {
                        ruleResultModel[queryRule]
                            = await findByFilter(
                            domain,
                            rulesBlockModelElement,
                            purgeNodeValue,
                            getNodes,
                            getNode,
                            getDataInStore,
                            securityController,
                            rulesBlockModel?.context,
                            {
                                bypassDomainVerification: rulesBlockModel?.context?.useMasterKey === true,
                                transaction: transactionSession
                            },
                            options);
                    }
                } catch (e) {
                    devLog(e);
                    ruleResultModel.errors[`${transactionSession ? 'transactionSession.' : ''}query.${domain}`] = {
                        message: e.message ? e.message : e.toString(),
                        path: `${transactionSession ? 'transactionSession.' : ''}query.${domain}`,
                        data: rulesBlockModelElement
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
                path: `${transactionSession ? 'transactionSession.' : ''}query`,
                data: null
            };
            if (transactionSession) {
                throw e;
            }
            return ruleResultModel;
        }
    }

    async handleBulkRule(
        rulesBlockModel: RulesModel,
        ruleResultModel: RuleResponse,
        updateRuleController: UpdateRuleController,
        authController: AuthController,
        securityController: SecurityController,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        purgeNodeValue: PurgeNodeValueFn,
        purgeNode: PurgeNodeFn,
        options: BFastOptions,
    ): Promise<RuleResponse> {
        try {
            const transactionRules = this.getRulesKey(rulesBlockModel).filter(rule => rule.startsWith('transaction'));
            if (transactionRules.length === 0) {
                return ruleResultModel;
            }
            const transactionRule = transactionRules[0];
            const transaction = rulesBlockModel[transactionRule];
            const transactionOperationRules = transaction.commit;
            const resultObject: RuleResponse = {errors: {}};
            await bulk(async session => {
                await this.handleCreateRules(
                    transactionOperationRules,
                    resultObject,
                    authController,
                    securityController,
                    getNodes,
                    getNode,
                    getDataInStore,
                    upsertNode,
                    upsertDataInStore,
                    purgeNodeValue,
                    options,
                    session
                );
                await this.handleUpdateRules(
                    transactionOperationRules,
                    resultObject,
                    updateRuleController,
                    authController,
                    securityController,
                    purgeNodeValue,
                    getNodes,
                    getNode,
                    getDataInStore,
                    upsertNode,
                    upsertDataInStore,
                    options,
                    session
                );
                await this.handleQueryRules(
                    transactionOperationRules,
                    resultObject,
                    authController,
                    securityController,
                    getNodes,
                    getNode,
                    getDataInStore,
                    purgeNodeValue,
                    options,
                    session
                );
                await this.handleDeleteRules(
                    transactionOperationRules,
                    resultObject,
                    authController,
                    securityController,
                    purgeNodeValue,
                    getNodes,
                    getNode,
                    getDataInStore,
                    purgeNode,
                    options,
                    session
                );
            });
            ruleResultModel.transaction = {commit: resultObject};
            return ruleResultModel;
        } catch (e) {
            devLog(e);
            ruleResultModel.errors.transaction = {
                message: e.message ? e.message : e.toString(),
                path: 'transaction',
                data: null
            };
            return ruleResultModel;
        }
    }

    async handleUpdateRules(
        rules: RulesModel,
        ruleResponse: RuleResponse,
        updateRuleController: UpdateRuleController,
        authController: AuthController,
        securityController: SecurityController,
        purgeNodeValue: PurgeNodeValueFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        options: BFastOptions,
        transactionSession: any
    ): Promise<RuleResponse> {
        try {
            const updateRules = this.getRulesKey(rules).filter(rule => rule.startsWith('update'));
            if (updateRules.length === 0) {
                return ruleResponse;
            }
            for (const updateRule of updateRules) {
                const domain = this.extractDomain(updateRule, 'update');
                const updateRuleRequests: UpdateRuleRequestModel = rules[updateRule];
                const allowed = await authController.hasPermission(
                    `update.${domain}`,
                    securityController,
                    rules.context,
                    purgeNodeValue,
                    getNodes,
                    getNode,
                    getDataInStore,
                    options
                );
                if (allowed !== true) {
                    ruleResponse.errors[`${transactionSession ? 'transaction.' : ''}update.${domain}`] = {
                        message: 'You have insufficient permission to this resource',
                        path: `${transactionSession ? 'transaction.' : ''}update.${domain}`,
                        data: updateRuleRequests
                    };
                    return ruleResponse;
                }
                try {
                    if (updateRuleRequests && Array.isArray(updateRuleRequests)) {
                        const partialResults = [];
                        for (const value of updateRuleRequests) {
                            const response = await updateRuleController.update(
                                rules,
                                domain,
                                purgeNodeValue,
                                getNodes,
                                getNode,
                                getDataInStore,
                                upsertNode,
                                upsertDataInStore,
                                value,
                                securityController,
                                null,
                                options
                            );
                            partialResults.push(response);
                        }
                        ruleResponse[updateRule] = partialResults;
                    } else {
                        ruleResponse[updateRule] = await updateRuleController.update(
                            rules,
                            domain,
                            purgeNodeValue,
                            getNodes,
                            getNode,
                            getDataInStore,
                            upsertNode,
                            upsertDataInStore,
                            updateRuleRequests,
                            securityController,
                            null,
                            options
                        );
                    }
                } catch (e) {
                    devLog(e);
                    ruleResponse.errors[`${transactionSession ? 'transaction.' : ''}update.${domain}`] = {
                        message: e.message ? e.message : e.toString(),
                        path: `${transactionSession ? 'transaction.' : ''}update.${domain}`,
                        data: updateRuleRequests
                    };
                    if (transactionSession) {
                        throw e;
                    }
                }
            }
            return ruleResponse;
        } catch (e) {
            console.log(e);
            ruleResponse.errors[`${transactionSession ? 'transaction.' : ''}update`] = {
                message: e.message ? e.message : e.toString(),
                path: `${transactionSession ? 'transaction.' : ''}update`,
                data: null
            };
            if (transactionSession) {
                throw e;
            }
            return ruleResponse;
        }
    }

    async handleStorageRule(
        rulesBlockModel: RulesModel,
        ruleResultModel: RuleResponse,
        storageController: StorageController,
        authController: AuthController,
        securityController: SecurityController,
        authAdapter: AuthAdapter,
        filesAdapter: FilesAdapter,
        purgeNodeValue: PurgeNodeValueFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        options: BFastOptions,
    ): Promise<RuleResponse> {
        try {
            const fileRules = this.getRulesKey(rulesBlockModel).filter(rule => rule.startsWith('files'));
            if (fileRules.length === 0) {
                return ruleResultModel;
            }
            const fileRule = fileRules[0];
            const file = rulesBlockModel[fileRule];
            for (const action of Object.keys(file)) {
                const data = file[action];
                try {
                    if (action === 'save') {
                        const allowed = await authController.hasPermission(
                            `files.save`,
                            securityController,
                            rulesBlockModel.context,
                            purgeNodeValue,
                            getNodes,
                            getNode,
                            getDataInStore,
                            options
                        );
                        if (allowed !== true) {
                            ruleResultModel.errors[`files.save`] = {
                                message: 'You have insufficient permission to save file',
                                path: `files.save`,
                                data
                            };
                        } else {
                            ruleResultModel.files = {};
                            ruleResultModel.files.save = await storageController.save(
                                data,
                                rulesBlockModel.context,
                                filesAdapter,
                                upsertNode,
                                upsertDataInStore,
                                securityController,
                                options
                            );
                        }
                    } else if (action === 'delete') {
                        const allowed = await authController.hasPermission(
                            `files.delete`,
                            securityController,
                            rulesBlockModel.context,
                            purgeNodeValue,
                            getNodes,
                            getNode,
                            getDataInStore,
                            options
                        );
                        if (allowed !== true) {
                            ruleResultModel.errors[`files.delete`] = {
                                message: 'You have insufficient permission delete file',
                                path: `files.delete`,
                                data
                            };
                        } else {
                            ruleResultModel.files = {};
                            ruleResultModel.files.delete = await storageController.delete(
                                data,
                                rulesBlockModel.context,
                                purgeNodeValue,
                                getNodes,
                                getNode,
                                getDataInStore,
                                securityController,
                                filesAdapter,
                                options
                            );
                        }
                    } else if (action === 'list') {
                        const allowed = await authController.hasPermission(
                            `files.list`,
                            securityController,
                            rulesBlockModel.context,
                            purgeNodeValue,
                            getNodes,
                            getNode,
                            getDataInStore,
                            options
                        );
                        if (allowed !== true) {
                            ruleResultModel.errors[`files.list`] = {
                                message: 'You have insufficient permission list files',
                                path: `files.delete`,
                                data
                            };
                        } else {
                            ruleResultModel.files = {};
                            ruleResultModel.files.list = await storageController.listFiles({
                                prefix: data && data.prefix ? data.prefix : '',
                                size: data && data.size ? data.size : 20,
                                after: data.after,
                                skip: data && data.skip ? data.skip : 0
                            },
                                filesAdapter,
                                purgeNodeValue,
                                getNodes,
                                getNode,
                                getDataInStore,
                                securityController,
                                options
                            );
                        }
                    }
                } catch (e) {
                    devLog(e);
                    ruleResultModel.errors[`files.${action}`] = {
                        message: e.message ? e.message : e.toString(),
                        path: `files.${action}`,
                        data
                    };
                }
            }
            return ruleResultModel;
        } catch (e) {
            devLog(e);
            ruleResultModel.errors.files = {
                message: e.message ? e.message : e.toString(),
                path: 'files',
                data: null
            };
            return ruleResultModel;
        }
    }

    extractDomain(
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

}
