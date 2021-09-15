import {BasicUserAttributesModel} from '../model/basic-user-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {BFastDatabaseOptions} from "../bfast-database.option";
import {DatabaseController} from "../controllers/database.controller";
import {SecurityController} from "../controllers/security.controller";
import {DatabaseAdapter} from "./database.adapter";

export abstract class AuthAdapter {
    abstract signUp<T extends BasicUserAttributesModel>(
        userModel: T,
        context: ContextBlock,
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        options: BFastDatabaseOptions
    ): Promise<T>;

    abstract signIn<T extends BasicUserAttributesModel>(
        userModel: T,
        context: ContextBlock,
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        options: BFastDatabaseOptions
    ): Promise<T>;

    abstract resetPassword(email: string, context: ContextBlock): Promise<any>;

    abstract updatePassword(
        password: string,
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any>;

    abstract deleteUser(context: ContextBlock,
                        databaseController: DatabaseController,
                        options: BFastDatabaseOptions
    ): Promise<any>;

    abstract update<T extends BasicUserAttributesModel>(
        userModel: T,
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<T>;

    abstract sendVerificationEmail(
        email: string,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any>;
}
