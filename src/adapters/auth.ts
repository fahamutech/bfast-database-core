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
}
