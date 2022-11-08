import {BasicUser} from '../../models/basic-user';
import {BFastOptions} from "../../bfast-option";
import {AuthAdapter} from "../../adapters/auth";
import {RuleContext} from "../../models/rule-context";
import {DatabaseAdapter} from "../../adapters/database";
import {findDataByFilterInStore} from "../database/query";

export async function signIn<T extends BasicUser>(
    userModel: T, authAdapter: AuthAdapter, context: RuleContext, options: BFastOptions
): Promise<any> {
    if (!userModel || !userModel.username) throw {message: 'Username required'}
    if (!userModel || !userModel.password) throw {message: 'Password required'}
    return authAdapter.signIn(userModel, context, options);
}

export async function signUp<T extends BasicUser>(
    userModel: T, authAdapter: AuthAdapter, databaseAdapter: DatabaseAdapter, context: RuleContext, options: BFastOptions
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
    const oldUser = await findDataByFilterInStore('_User', queryModel, context, databaseAdapter, wOptions, options)
    if (Array.isArray(oldUser) && oldUser.length > 0) {
        // console.log('INFO: TRY RE SIGNUP');
        throw {message: 'User already exist'};
    }
    return await authAdapter.signUp(userModel, context, options);
}
