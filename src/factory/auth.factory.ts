import {AuthAdapter} from '../adapters/auth.adapter';
import {BasicUserAttributesModel} from '../model/basic-user-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {DatabaseController} from '../controllers/database.controller';
import {SecurityController} from '../controllers/security.controller';

let databaseController: DatabaseController;
let securityController: SecurityController;

export class AuthFactory implements AuthAdapter {
    private domainName = '_User';

    constructor(database: DatabaseController,
                security: SecurityController) {
        databaseController = database;
        securityController = security;
    }

    async resetPassword(email: string, context?: ContextBlock): Promise<any> {
        const users = await databaseController.query(this.domainName, {
            filter: {
                email: email
            },
            return: []
        }, context, {
            bypassDomainVerification: true
        });
    }

    async signIn<T extends BasicUserAttributesModel>(userModel: T, context: ContextBlock): Promise<T> {
        const users = await databaseController.query(this.domainName, {
            filter: {
                username: userModel.username
            },
            return: []
        }, context, {
            bypassDomainVerification: true
        });
        if (users && Array.isArray(users) && users.length === 1) {
            const user = users[0];
            if (await securityController.comparePassword(userModel.password, user.password ? user.password : user._hashed_password)) {
                delete user.password;
                delete user._hashed_password;
                delete user._acl;
                delete user._rperm;
                delete user._wperm;
                user.token = await securityController.generateToken({uid: user.id});
                return user;
            } else {
                throw new Error('Password is not valid');
            }
        } else {
            throw new Error('Username is not valid');
        }
    }

    async signUp<T extends BasicUserAttributesModel>(userModel: T, context: ContextBlock): Promise<T> {
        userModel.password = await securityController.hashPlainText(userModel?.password);
        const user = await databaseController.writeOne(this.domainName, userModel, context, {
            bypassDomainVerification: true
        });
        delete user.password;
        user.token = await securityController.generateToken({uid: user.id});
        return user;
    }

    async deleteUser(context?: ContextBlock): Promise<any> {
        return Promise.resolve(undefined);
    }

    async sendVerificationEmail(email: string, context?: ContextBlock): Promise<any> {
        return Promise.resolve(undefined);
    }

    async update<T extends BasicUserAttributesModel>(userModel: T, context?: ContextBlock): Promise<T> {
        return databaseController.update(this.domainName, {
            id: context.uid,
            update: {
                $set: userModel
            }
        }, context, {bypassDomainVerification: true, dbOptions: {upsert: false}});
    }

    async updatePassword(password: string, context?: ContextBlock): Promise<any> {
        const hashedPassword = await securityController.hashPlainText(password);
        return databaseController.update(this.domainName, {
            id: context.uid,
            update: {
                $set: {
                    password: hashedPassword
                }
            }
        }, context, {bypassDomainVerification: true});
    }
}
