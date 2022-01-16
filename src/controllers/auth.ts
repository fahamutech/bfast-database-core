import {BasicUser, BasicUserSchema} from '../models/basic-user';
import {BFastOptions} from "../bfast-option";
import {AuthAdapter} from "../adapters/auth.adapter";
import {findDataByFilterInStore} from "./database";
import {RuleContext} from "../models/rule-context";
import {validateInput} from "../utils";

// export async function deleteUser(context?: RuleContext): Promise<any> {
//     return Promise.resolve(undefined);
// }

// export async function resetPassword(
//     authAdapter: AuthAdapter, email: string, context: RuleContext
// ): Promise<any> {
//     if (!email) {
//         throw {message: 'email required'};
//     }
//     return authAdapter.resetPassword(email, context);
// }

// export async function sendVerificationEmail(
//     email: string, authAdapter: AuthAdapter, context: RuleContext, options: BFastOptions
// ): Promise<any> {
//     if (!email) {
//         throw {message: 'email required'};
//     }
//     return authAdapter.sendVerificationEmail(email, context, options);
// }

export async function signIn<T extends BasicUser>(
    userModel: T, authAdapter: AuthAdapter, context: RuleContext, options: BFastOptions
): Promise<any> {
    if (!userModel || !userModel.username) throw {message: 'Username required'}
    if (!userModel || !userModel.password) throw {message: 'Password required'}
    // await validateInput(userModel, BasicUserSchema, 'invalid user data')
    return authAdapter.signIn(userModel, context, options);
}

export async function signUp<T extends BasicUser>(
    userModel: T, authAdapter: AuthAdapter, context: RuleContext, options: BFastOptions
): Promise<any> {
    if (!userModel || !userModel.email) throw {message: 'Email required'}
    if (!userModel || !userModel.username) throw {message: 'Username required'}
    if (!userModel || !userModel.password) throw {message: 'Password required'}
    userModel.return = []
    userModel.emailVerified = false
    const queryModel = {
        filter: {$or: [{username: userModel.username}, {email: userModel.email}]},
        return: []
    }
    const wOptions = {bypassDomainVerification: true}
    const oldUser = await findDataByFilterInStore('_User', queryModel, context, wOptions, options)
    if (Array.isArray(oldUser) && oldUser.length > 0) {
        console.log('INFO: TRY RE SIGNUP');
        throw {message: 'User already exist'};
    }
    return await authAdapter.signUp(userModel, context, options);
}

// export async function update<T extends BasicUser>(
//     userModel: T, authAdapter: AuthAdapter, context: RuleContext, options: BFastOptions
// ): Promise<any> {
//     if (context.auth === true && context.uid && typeof context.uid === 'string') {
//         userModel.return = [];
//         delete userModel.password;
//         delete userModel._hashed_password;
//         delete userModel.emailVerified;
//         return authAdapter.update(userModel, context, options);
//     } else {
//         return Promise.reject({message: 'please authenticate yourself'});
//     }
// }

// export async function updatePassword(
//     password: string, authAdapter: AuthAdapter, context: RuleContext, options: BFastOptions
// ): Promise<any> {
//     if (context.uid && typeof context.uid === 'string') {
//         return authAdapter.updatePassword(password, context, options);
//     } else {
//         return Promise.reject({message: 'Fails to updated password of unknown user id'});
//     }
// }
