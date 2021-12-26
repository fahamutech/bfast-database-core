import {AuthAdapter} from '../adapters/auth.adapter';
import {BasicUser} from '../models/basic-user';
import {BFastOptions} from "../bfast-option";
import {findByFilter, updateData, writeOne} from "../controllers/database.controller";

import {comparePassword, getToken, hashPlainText} from "../controllers/security.controller";
import {RuleContext} from "../models/rule-context";

export class AuthFactory implements AuthAdapter {
    private domainName = '_User';

    constructor() {
    }

    async resetPassword(email: string, context?: RuleContext): Promise<any> {
        return undefined;
    }

    async signIn<T extends BasicUser>(
        userModel: T,
        context: RuleContext,
        options: BFastOptions
    ): Promise<T> {
        const users = await findByFilter(
            this.domainName,
            {
                filter: {
                    username: userModel.username
                },
                return: []
            },
            context,
            {bypassDomainVerification: true},
            options
        );
        if (users && Array.isArray(users) && users.length === 1) {
            const user = users[0];
            if (await comparePassword(userModel.password, user.password ? user.password : user._hashed_password)) {
                delete user.password;
                delete user._hashed_password;
                delete user._acl;
                delete user._rperm;
                delete user._wperm;
                user.token = await getToken({uid: user.id}, options);
                return user;
            } else {
                throw new Error('Password is not valid');
            }
        } else {
            // console.log(users);
            throw new Error('Username is not valid');
        }
    }

    async signUp<T extends BasicUser>(
        userModel: T, context: RuleContext, options: BFastOptions
    ): Promise<T> {
        userModel.password = await hashPlainText(userModel?.password);
        const user = await writeOne(
            this.domainName,
            userModel,
            false,
            context,
            {bypassDomainVerification: true},
            options
        );
        delete user.password;
        user.token = await getToken({uid: user.id}, options);
        return user;
    }

    async sendVerificationEmail(email: string, context?: RuleContext): Promise<any> {
        return undefined;
    }

    async update<T extends BasicUser>(
        userModel: T,
        context: RuleContext,
        options: BFastOptions
    ): Promise<{message: string, modified: number}> {
        return updateData(
            this.domainName,
            {
                id: context.uid,
                upsert: false,
                update: {
                    $set: userModel
                }
            },
            context,
            {bypassDomainVerification: true},
            options
        );
    }

    async updatePassword(
        password: string,
        context: RuleContext,
        options: BFastOptions
    ): Promise<any> {
        const hashedPassword = await hashPlainText(password);
        return updateData(
            this.domainName,
            {
                id: context.uid,
                update: {
                    $set: {
                        password: hashedPassword
                    }
                }
            },
            context,
            {bypassDomainVerification: true},
            options
        );
    }
}
