import {AuthAdapter} from '../adapters/auth.adapter';
import {BasicUserAttributesModel} from '../model/basic-user-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {BFastDatabaseOptions} from "../bfast-database.option";
import {SecurityController} from "../controllers/security.controller";
import {DatabaseController} from "../controllers/database.controller";
import {DatabaseAdapter} from "../adapters/database.adapter";

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
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        options: BFastDatabaseOptions
    ): Promise<T> {
        const users = await databaseController.query(
            this.domainName,
            {
                filter: {
                    username: userModel.username
                },
                return: []
            },
            databaseAdapter,
            securityController,
            context,
            {bypassDomainVerification: true},
            options
        );
        if (users && Array.isArray(users) && users.length === 1) {
            const user = users[0];
            const securityController = new SecurityController();
            if (await securityController.comparePassword(userModel.password, user.password ? user.password : user._hashed_password)) {
                delete user.password;
                delete user._hashed_password;
                delete user._acl;
                delete user._rperm;
                delete user._wperm;
                user.token = await securityController.getToken({uid: user.id}, options);
                return user;
            } else {
                throw new Error('Password is not valid');
            }
        } else {
            throw new Error('Username is not valid');
        }
    }

    async signUp<T extends BasicUserAttributesModel>(
        userModel: T,
        context: ContextBlock,
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        options: BFastDatabaseOptions
    ): Promise<T> {
        userModel.password = await securityController.hashPlainText(userModel?.password);
        const user = await databaseController.writeOne(
            this.domainName,
            userModel,
            databaseAdapter,
            securityController,
            context,
            {bypassDomainVerification: true},
            options
        );
        delete user.password;
        user.token = await securityController.getToken({uid: user.id}, options);
        return user;
    }

    async deleteUser(context: ContextBlock): Promise<any> {
        return undefined;
    }

    async sendVerificationEmail(email: string, context?: ContextBlock): Promise<any> {
        return undefined;
    }

    async update<T extends BasicUserAttributesModel>(
        userModel: T,
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<T> {
        return databaseController.updateOne(
            this.domainName,
            {
                id: context.uid,
                upsert: false,
                update: {
                    $set: userModel
                }
            },
            databaseAdapter,
            securityController,
            context,
            {bypassDomainVerification: true},
            options
        );
    }

    async updatePassword(
        password: string,
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any> {
        const hashedPassword = await securityController.hashPlainText(password);
        return databaseController.updateOne(
            this.domainName,
            {
                id: context.uid,
                update: {
                    $set: {
                        password: hashedPassword
                    }
                }
            },
            databaseAdapter,
            securityController,
            context,
            {bypassDomainVerification: true},
            options
        );
    }
}
