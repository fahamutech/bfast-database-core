import {AuthAdapter} from "../adapter/AuthAdapter";
import {ContextBlock} from "../model/Rules";
import {BasicUserAttributes} from "../model/BasicUserAttributes";
import {DatabaseController} from "./database.controller";

let _auth: AuthAdapter;
let _databaseController: DatabaseController;

export class AuthController {
    private policyDomainName = '_Policy';

    constructor(private readonly auth: AuthAdapter,
                private readonly database: DatabaseController) {
        _auth = this.auth;
        _databaseController = this.database
    }

    async addAuthorizationRule(ruleId: string, rule: string, context: ContextBlock): Promise<any> {
        const rules = await _databaseController.query(this.policyDomainName, {
            filter: {
                ruleId: ruleId
            }
        }, context, {
            bypassDomainVerification: context && context.useMasterKey === true
        });
        if (rules && rules.length > 0) {
            return _databaseController.update(this.policyDomainName, {
                filter: {
                    ruleId: ruleId
                },
                upsert: true,
                return: [],
                update: {
                    // @ts-ignore
                    $set: {
                        ruleId: ruleId,
                        ruleBody: rule,
                    }
                }
            }, context, {
                bypassDomainVerification: context && context.useMasterKey === true
            });
        } else {
            return _databaseController.writeOne(this.policyDomainName, {
                ruleId: ruleId,
                ruleBody: rule,
                return: [],
            }, context, {
                bypassDomainVerification: context && context.useMasterKey === true
            });
        }
    }

    /**
     * execute saved policy to determine if someone has access to that resource. If no policy found return true (
     *  as assumption that its under dev mode, but you you required to set policies to secure your resources
     * )
     * @param ruleId {string}
     * @param context {ContextBlock}
     */
    async hasPermission(ruleId: string, context: ContextBlock): Promise<boolean> {
        if (context && context?.useMasterKey === true) {
            return true;
        }
        const filter = {
            $or: []
        };
        const originalRule = ruleId;
        let globalRule;
        const ruleIdInArray = ruleId.split('.');
        if (ruleIdInArray.length >= 2) {
            ruleIdInArray[1] = '*';
            globalRule = ruleIdInArray.join('.');
            filter.$or.push({ruleId: globalRule});
        }
        filter.$or.push({ruleId: originalRule});
        const query: any[] = await _databaseController.query(this.policyDomainName, {
            return: [],
            filter: filter,
        }, context, {
            bypassDomainVerification: true
        });
        if (query.length === 0) {
            return true;
        }
        const originalRuleResult = query.filter(value => value.ruleId === originalRule);
        if (originalRuleResult && originalRuleResult.length === 1 && originalRuleResult[0].ruleBody) {
            const execRule = new Function('context', originalRuleResult[0].ruleBody);
            return execRule(context) === true;
        }
        const globalRuleResult = query.filter(value => value.ruleId === globalRule);
        if (globalRuleResult && globalRuleResult.length === 1 && globalRuleResult[0].ruleBody) {
            const execRule = new Function('context', globalRuleResult[0].ruleBody);
            return execRule(context) === true;
        }
        return false;
    }

    async deleteUser(context?: ContextBlock): Promise<any> {
        return Promise.resolve(undefined);
    }

    async resetPassword(email: string, context?: ContextBlock): Promise<any> {
        return _auth.resetPassword(email, context);
    }

    async sendVerificationEmail(email: string, context?: ContextBlock): Promise<any> {
        return Promise.resolve(undefined);
    }

    async signIn<T extends BasicUserAttributes>(userModel: T, context?: ContextBlock): Promise<T> {
        AuthController.validateData(userModel, true);
        userModel.return = [];
        return _auth.signIn(userModel, context);
    }

    async signUp<T extends BasicUserAttributes>(userModel: T, context?: ContextBlock): Promise<T> {
        AuthController.validateData(userModel);
        userModel.return = [];
        return _auth.signUp(userModel, context);
    }

    async update<T extends BasicUserAttributes>(userModel: T, context?: ContextBlock): Promise<T> {
        return Promise.resolve(undefined);
    }

    async updatePassword(password: string, context?: ContextBlock): Promise<any> {
        return Promise.resolve(undefined);
    }

    private static validateData<T extends BasicUserAttributes>(data: T, skipEmail = false) {
        if (!data) {
            throw new Error("Invalid user data");
        } else if (Object.keys(data).length === 0) {
            throw new Error("Empty user is not supported");
        } else if (!data.username) {
            throw new Error('Username required');
        } else if (!data.password) {
            throw new Error('Password required');
        } else if (!data.email && !skipEmail) {
            throw new Error('Email required');
        } else {
            return;
        }
    }
}
