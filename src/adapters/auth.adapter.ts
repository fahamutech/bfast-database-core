import {BasicUserAttributesModel} from '../models/basic-user-attributes.model';
import {ContextBlock} from '../models/rules.model';
import {BFastOptions} from "../bfast-database.option";

export abstract class AuthAdapter {
    abstract signUp<T extends BasicUserAttributesModel>(
        userModel: T,
        context: ContextBlock,
        options: BFastOptions
    ): Promise<T>;

    abstract signIn<T extends BasicUserAttributesModel>(
        userModel: T,
        context: ContextBlock,
        options: BFastOptions
    ): Promise<T>;

    abstract resetPassword(email: string, context: ContextBlock): Promise<any>;

    abstract updatePassword(
        password: string,
        context: ContextBlock,
        options: BFastOptions
    ): Promise<any>;

    abstract update<T extends BasicUserAttributesModel>(
        userModel: T,
        context: ContextBlock,
        options: BFastOptions
    ): Promise<T>;

    abstract sendVerificationEmail(
        email: string,
        context: ContextBlock,
        options: BFastOptions
    ): Promise<any>;
}
