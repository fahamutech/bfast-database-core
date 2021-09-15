import {ContextBlock} from '../model/rules.model';
import {BasicUserAttributesModel} from '../model/basic-user-attributes.model';
import {DatabaseController} from './database.controller';
import {BFastDatabaseOptions} from "../bfast-database.option";
import {SecurityController} from "./security.controller";
import {AuthAdapter} from "../adapters/auth.adapter";
import {DatabaseAdapter} from "../adapters/database.adapter";

export class AuthController {

    constructor() {
    }

    private policyDomainName = '_Policy';

    private static validateData<T extends BasicUserAttributesModel>(data: T, skipEmail = false): void {
        if (!data) {
            throw new Error('Invalid user data');
        } else if (Object.keys(data).length === 0) {
            throw new Error('Empty user is not supported');
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

    private static sanitizePolicy(_p1) {
        if (_p1.id) {
            _p1.id = _p1.id.replace('%id', '').replace(new RegExp('[%]', 'ig'), '.');
        }
        if (_p1.ruleId) {
            _p1.ruleId = _p1.ruleId.replace(new RegExp('[%]', 'ig'), '.');
        }
        if (_p1.ruleBody) {
            _p1.ruleBody = _p1.ruleBody.replace(new RegExp('[%]', 'ig'), '.');
        }
        return _p1;
    }

    async addPolicyRule(
        ruleId: string,
        rule: string,
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any> {
        const _p1 = await databaseController.writeOne(
            this.policyDomainName,
            {
                id: ruleId.replace('.', '%').concat('%id'),
                ruleId: ruleId.replace('.', '%'),
                ruleBody: rule.replace('.', '%'),
                return: []
            },
            databaseAdapter,
            securityController,
            context,
            {
                bypassDomainVerification: context && context.useMasterKey === true
            },
            options
        );
        return AuthController.sanitizePolicy(_p1);
    }

    async listPolicyRule(
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ) {
        const _j1 = await databaseController.query(
            '_Policy',
            {
                filter: {},
                return: []
            },
            databaseAdapter,
            securityController,
            context,
            {
                bypassDomainVerification: true
            },
            options);
        return _j1.map(x => AuthController.sanitizePolicy(x));
    }

    async removePolicyRule(
        ruleId: string,
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ) {
        const _y89 = await databaseController.delete(
            '_Policy',
            {
                filter: {
                    ruleId: ruleId.replace('.', '%'),
                },
                return: ['id'],
            },
            databaseAdapter,
            securityController,
            context,
            {
                bypassDomainVerification: true
            },
            options);
        return _y89.map(z => AuthController.sanitizePolicy(z));
    }

    async hasPermission(
        ruleId: string,
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<boolean> {
        if (context && context?.useMasterKey === true) {
            return true;
        }
        const filter = [];
        const originalRule = ruleId;
        let globalRule;
        const ruleIdInArray = ruleId.split('.');
        if (ruleIdInArray.length >= 2) {
            ruleIdInArray[1] = '*';
            globalRule = ruleIdInArray.join('.');
            filter.push({ruleId: globalRule.replace('.', '%')});
        }
        filter.push({ruleId: originalRule.replace('.', '%')});
        let query: any[] = await databaseController.query(
            this.policyDomainName,
            {
                return: [],
                filter,
            },
            databaseAdapter,
            securityController,
            context,
            {
                bypassDomainVerification: true
            },
            options
        );
        query = query.map(x => AuthController.sanitizePolicy(x));
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

    async resetPassword(
        authAdapter: AuthAdapter,
        email: string,
        context: ContextBlock
    ): Promise<any> {
        if (!email) {
            throw {message: 'email required'};
        }
        return authAdapter.resetPassword(email, context);
    }

    async sendVerificationEmail(
        email: string,
        authAdapter: AuthAdapter,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any> {
        if (!email) {
            throw {message: 'email required'};
        }
        return authAdapter.sendVerificationEmail(email, context, options);
    }

    async signIn<T extends BasicUserAttributesModel>(
        userModel: T,
        databaseController: DatabaseController,
        securityController: SecurityController,
        authAdapter: AuthAdapter,
        databaseAdapter: DatabaseAdapter,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<T> {
        AuthController.validateData(userModel, true);
        userModel.return = [];
        return authAdapter.signIn(
            userModel,
            context,
            databaseController,
            securityController,
            databaseAdapter,
            options
        );
    }

    async signUp<T extends BasicUserAttributesModel>(
        userModel: T,
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        authAdapter: AuthAdapter,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<T> {
        AuthController.validateData(userModel);
        userModel.return = [];
        userModel.emailVerified = false;
        const oldUser = await databaseController.query(
            '_User',
            {
                filter: [
                    {username: userModel.username},
                    {email: userModel.email},
                ],
                return: []
            },
            databaseAdapter,
            securityController,
            context,
            {bypassDomainVerification: true},
            options
        );
        if (Array.isArray(oldUser) && oldUser.length > 0) {
            throw {message: 'User already exist'};
        }
        return await authAdapter.signUp(
            userModel,
            context,
            databaseController,
            securityController,
            databaseAdapter,
            options
        );
    }

    async update<T extends BasicUserAttributesModel>(
        userModel: T,
        databaseController: DatabaseController,
        securityController: SecurityController,
        authAdapter: AuthAdapter,
        databaseAdapter: DatabaseAdapter,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<T> {
        if (context.auth === true && context.uid && typeof context.uid === 'string') {
            userModel.return = [];
            delete userModel.password;
            delete userModel._hashed_password;
            delete userModel.emailVerified;
            return authAdapter.update(
                userModel,
                databaseController,
                securityController,
                databaseAdapter,
                context,
                options
            );
        } else {
            return Promise.reject({message: 'please authenticate yourself'});
        }
    }

    async updatePassword(
        password: string,
        databaseController: DatabaseController,
        securityController: SecurityController,
        authAdapter: AuthAdapter,
        databaseAdapter: DatabaseAdapter,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any> {
        if (context.uid && typeof context.uid === 'string') {
            return authAdapter.updatePassword(
                password,
                databaseController,
                securityController,
                databaseAdapter,
                context,
                options
            );
        } else {
            return Promise.reject({message: 'Fails to updated password of unknown user id'});
        }
    }
}
