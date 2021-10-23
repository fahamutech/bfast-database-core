import {AuthAdapter} from '../adapters/auth.adapter';
import {BasicUserAttributesModel} from '../models/basic-user-attributes.model';
import {ContextBlock} from '../models/rules.model';
import {BFastOptions} from "../bfast-database.option";
import {findByFilter, updateOne, writeOne} from "../controllers/database.controller";

import {comparePassword, getToken, hashPlainText} from "../controllers/security.controller";

export class AuthFactory implements AuthAdapter {
    private domainName = '_User';

    constructor() {
    }

    async resetPassword(email: string, context?: ContextBlock): Promise<any> {
        return undefined;
    }

    async signIn<T extends BasicUserAttributesModel>(
        userModel: T,
        context: ContextBlock,
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
            throw new Error('Username is not valid');
        }
    }

    async signUp<T extends BasicUserAttributesModel>(
        userModel: T, context: ContextBlock, options: BFastOptions
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

    async sendVerificationEmail(email: string, context?: ContextBlock): Promise<any> {
        return undefined;
    }

    async update<T extends BasicUserAttributesModel>(
        userModel: T,
        context: ContextBlock,
        options: BFastOptions
    ): Promise<T> {
        return updateOne(
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
        context: ContextBlock,
        options: BFastOptions
    ): Promise<any> {
        const hashedPassword = await hashPlainText(password);
        return updateOne(
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
