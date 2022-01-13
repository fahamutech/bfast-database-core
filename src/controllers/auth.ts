import {BasicUser} from '../models/basic-user';
import {BFastOptions} from "../bfast-option";
import {AuthAdapter} from "../adapters/auth.adapter";
import {findByFilter} from "./database.controller";
import {RuleContext} from "../models/rule-context";


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
