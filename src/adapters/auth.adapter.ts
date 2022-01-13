import {BasicUser} from '../models/basic-user';
import {BFastOptions} from "../bfast-option";
import {RuleContext} from "../models/rule-context";

export abstract class AuthAdapter {
    abstract signUp<T extends BasicUser>(
        userModel: T, context: RuleContext, options: BFastOptions
    ): Promise<T>;

    abstract signIn<T extends BasicUser>(
        userModel: T,
        context: RuleContext,
        options: BFastOptions
    ): Promise<T>;

    // abstract resetPassword(email: string, context: RuleContext): Promise<any>;

    // abstract updatePassword(
    //     password: string,
    //     context: RuleContext,
    //     options: BFastOptions
    // ): Promise<any>;

    // abstract updateUserInStore<T extends BasicUser>(
    //     userModel: T,
    //     context: RuleContext,
    //     options: BFastOptions
    // ): Promise<{message: string, modified: number}>;

    // abstract sendVerificationEmail(
    //     email: string,
    //     context: RuleContext,
    //     options: BFastOptions
    // ): Promise<any>;
}
