import {BasicUser} from '../models/basic-user';
import {BFastOptions} from "../bfast-option";
import {AuthAdapter} from "../adapters/auth.adapter";
import {findByFilter, remove, writeOne} from "./database.controller";
import {RuleContext} from "../models/rule-context";

const policyDomainName = '_Policy';

export function validateData<T extends BasicUser>(data: T, skipEmail = false): void {
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

export function sanitizePolicy(_p1) {
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

export async function addPolicyRule(
    ruleId: string, rule: string, context: RuleContext, options: BFastOptions
): Promise<any> {
    const _p1 = await writeOne(
        policyDomainName,
        {
            id: ruleId.replace('.', '%').concat('%id'),
            ruleId: ruleId.replace('.', '%'),
            ruleBody: rule.replace('.', '%'),
            return: []
        },
        false,
        context,
        {
            bypassDomainVerification: context && context.useMasterKey === true
        },
        options
    );
    return sanitizePolicy(_p1);
}

export async function listPolicyRule(context: RuleContext, options: BFastOptions) {
    const _j1 = await findByFilter(
        '_Policy',
        {
            filter: {},
            return: []
        },
        context,
        {
            bypassDomainVerification: true
        },
        options
    );
    return _j1.map(x => sanitizePolicy(x));
}

export async function removePolicyRule(ruleId: string, context: RuleContext, options: BFastOptions) {
    const _y89 = await remove(
        '_Policy',
        {
            filter: {
                ruleId: ruleId.replace('.', '%'),
            },
            return: ['id'],
        },
        context,
        {
            bypassDomainVerification: true
        },
        options);
    return _y89.map(z => sanitizePolicy(z));
}

export async function hasPermission(ruleId: string, context: RuleContext, options: BFastOptions): Promise<boolean> {
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
    let query: any[] = await findByFilter(
        policyDomainName,
        {
            return: [],
            filter: {
                $or: filter
            },
        },
        context,
        {
            bypassDomainVerification: true
        },
        options
    );
    query = query.map(x => sanitizePolicy(x));
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

export async function deleteUser(context?: RuleContext): Promise<any> {
    return Promise.resolve(undefined);
}

export async function resetPassword(authAdapter: AuthAdapter, email: string, context: RuleContext): Promise<any> {
    if (!email) {
        throw {message: 'email required'};
    }
    return authAdapter.resetPassword(email, context);
}

export async function sendVerificationEmail(email: string, authAdapter: AuthAdapter, context: RuleContext, options: BFastOptions): Promise<any> {
    if (!email) {
        throw {message: 'email required'};
    }
    return authAdapter.sendVerificationEmail(email, context, options);
}

export async function signIn<T extends BasicUser>(
    userModel: T,
    authAdapter: AuthAdapter,
    context: RuleContext,
    options: BFastOptions
): Promise<T> {
    validateData(userModel, true);
    // userModel.return = [];
    return authAdapter.signIn(userModel, context, options);
}

export async function signUp<T extends BasicUser>(
    userModel: T,
    authAdapter: AuthAdapter,
    context: RuleContext,
    options: BFastOptions
): Promise<T> {
    validateData(userModel);
    userModel.return = [];
    userModel.emailVerified = false;
    const oldUser = await findByFilter(
        '_User',
        {
            filter: {
                $or: [
                    {username: userModel.username},
                    {email: userModel.email}
                ]
            },
            return: []
        },
        context,
        {bypassDomainVerification: true},
        options
    );
    if (Array.isArray(oldUser) && oldUser.length > 0) {
        console.log(oldUser, 'INFO: TRY RE SIGNUP');
        throw {message: 'User already exist'};
    }
    return await authAdapter.signUp(userModel, context, options);
}

export async function update<T extends BasicUser>(
    userModel: T,
    authAdapter: AuthAdapter,
    context: RuleContext,
    options: BFastOptions
): Promise<any> {
    if (context.auth === true && context.uid && typeof context.uid === 'string') {
        userModel.return = [];
        delete userModel.password;
        delete userModel._hashed_password;
        delete userModel.emailVerified;
        return authAdapter.update(userModel, context, options);
    } else {
        return Promise.reject({message: 'please authenticate yourself'});
    }
}

export async function updatePassword(
    password: string,
    authAdapter: AuthAdapter,
    context: RuleContext,
    options: BFastOptions
): Promise<any> {
    if (context.uid && typeof context.uid === 'string') {
        return authAdapter.updatePassword(password, context, options);
    } else {
        return Promise.reject({message: 'Fails to updated password of unknown user id'});
    }
}
