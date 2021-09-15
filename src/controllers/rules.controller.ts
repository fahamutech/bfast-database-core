import {RuleResponse, RulesModel} from '../model/rules.model';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {DeleteModel} from '../model/delete-model';
import {DatabaseController} from './database.controller';
import {AuthController} from './auth.controller';
import {StorageController} from './storage.controller';
import {UpdateRuleController} from './update.rule.controller';
import {BFastDatabaseOptions} from '../bfast-database.option';
import {devLog} from "../utils/debug.util";
import {SecurityController} from "./security.controller";
import {AuthAdapter} from "../adapters/auth.adapter";
import {DatabaseAdapter} from "../adapters/database.adapter";
import {FilesAdapter} from "../adapters/files.adapter";

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
        databaseController: DatabaseController,
        securityController: SecurityController,
        authAdapter: AuthAdapter,
        databaseAdapter: DatabaseAdapter,
        options: BFastDatabaseOptions,
    ): Promise<RuleResponse> {
        try {
            return this.processAuthenticationBlock(
                ruleResponse,
                rules,
                authController,
                databaseController,
                securityController,
                authAdapter,
                databaseAdapter,
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
        databaseController: DatabaseController,
        securityController: SecurityController,
        authAdapter: AuthAdapter,
        databaseAdapter: DatabaseAdapter,
        options: BFastDatabaseOptions,
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
                        databaseController,
                        securityController,
                        databaseAdapter,
                        authAdapter,
                        rules.context,
                        options
                    );
                    ruleResponse.auth = {};
                    ruleResponse.auth.signUp = signUpResponse;
                } else if (action === 'signIn') {
                    const signInResponse = await authController.signIn(
                        data,
                        databaseController,
                        securityController,
                        authAdapter,
                        databaseAdapter,
                        rules.context,
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
                // console.log(e);
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
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        options: BFastDatabaseOptions,
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
                                databaseController,
                                securityController,
                                databaseAdapter,
                                rules.context,
                                options
                            );
                        }
                        ruleResponse.policy = {};
                        ruleResponse.policy[action] = authorizationResults;
                    } else if (action === 'list' && typeof data === 'object') {
                        const listResponse = await authController.listPolicyRule(
                            databaseController,
                            securityController,
                            databaseAdapter,
                            rules.context,
                            options
                        );
                        ruleResponse.policy = {};
                        ruleResponse.policy[action] = listResponse
                    } else if (action === 'remove' && typeof data === 'object') {
                        const removeResponse = await authController.removePolicyRule(
                            data.ruleId,
                            databaseController,
                            securityController,
                            databaseAdapter,
                            rules.context,
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
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter,
        options: BFastDatabaseOptions,
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
                    databaseController,
                    securityController,
                    databaseAdapter,
                    rules?.context,
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
                        result = await databaseController.writeMany(
                            domain,
                            createRuleRequest,
                            databaseAdapter,
                            securityController,
                            rules?.context,
                            {
                                bypassDomainVerification: rules?.context?.useMasterKey === true,
                                transaction: transactionSession
                            },
                            options);
                    } else {
                        result = await databaseController.writeOne(
                            domain,
                            createRuleRequest,
                            databaseAdapter,
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
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter,
        options: BFastDatabaseOptions,
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
                    databaseController,
                    securityController,
                    databaseAdapter,
                    rulesBlockModel?.context,
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
                        ruleResultModel[deleteRule] = await databaseController.delete(
                            domain,
                            rulesBlockModelElement,
                            databaseAdapter,
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
                        ruleResultModel[deleteRule] = await databaseController.delete(
                            domain,
                            rulesBlockModelElement,
                            databaseAdapter,
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
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter,
        options: BFastDatabaseOptions,
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
                    databaseController,
                    securityController,
                    databaseAdapter,
                    rulesBlockModel?.context,
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
                            = await databaseController.query(
                            domain,
                            rulesBlockModelElement,
                            databaseAdapter,
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
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter,
        options: BFastDatabaseOptions,
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
            await databaseController.bulk(databaseAdapter, async session => {
                await this.handleCreateRules(
                    transactionOperationRules,
                    resultObject,
                    authController,
                    databaseController,
                    securityController,
                    databaseAdapter,
                    options,
                    session
                );
                await this.handleUpdateRules(
                    transactionOperationRules,
                    resultObject,
                    updateRuleController,
                    authController,
                    databaseController,
                    securityController,
                    databaseAdapter,
                    options,
                    session
                );
                await this.handleQueryRules(
                    transactionOperationRules,
                    resultObject,
                    authController,
                    databaseController,
                    securityController,
                    databaseAdapter,
                    options,
                    session
                );
                await this.handleDeleteRules(
                    transactionOperationRules,
                    resultObject,
                    authController,
                    databaseController,
                    securityController,
                    databaseAdapter,
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
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        options: BFastDatabaseOptions,
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
                    databaseController,
                    securityController,
                    databaseAdapter,
                    rules.context,
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
                                databaseAdapter,
                                value,
                                databaseController,
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
                            databaseAdapter,
                            updateRuleRequests,
                            databaseController,
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
        databaseController: DatabaseController,
        securityController: SecurityController,
        authAdapter: AuthAdapter,
        databaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions,
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
                            databaseController,
                            securityController,
                            databaseAdapter,
                            rulesBlockModel.context,
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
                                databaseAdapter,
                                options
                            );
                        }
                    } else if (action === 'delete') {
                        const allowed = await authController.hasPermission(
                            `files.delete`,
                            databaseController,
                            securityController,
                            databaseAdapter,
                            rulesBlockModel.context,
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
                                databaseAdapter,
                                filesAdapter,
                                options
                            );
                        }
                    } else if (action === 'list') {
                        const allowed = await authController.hasPermission(
                            `files.list`,
                            databaseController,
                            securityController,
                            databaseAdapter,
                            rulesBlockModel.context,
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
                                databaseAdapter,
                                filesAdapter,
                                options);
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
