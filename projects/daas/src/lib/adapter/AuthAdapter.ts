import {BasicUserAttributes} from "../model/BasicUserAttributes";
import {ContextBlock} from "../model/Rules";

export interface AuthAdapter {
    signUp<T extends BasicUserAttributes>(userModel: T, context?: ContextBlock): Promise<T>;

    signIn<T extends BasicUserAttributes>(userModel: T, context?: ContextBlock): Promise<T>;

    resetPassword(email: string, context?: ContextBlock): Promise<any>;

    // updatePassword(password: string, context?: ContextBlock): Promise<any>;

    deleteUser(context?: ContextBlock): Promise<any>;

    update<T extends BasicUserAttributes>(userModel: T, context?: ContextBlock): Promise<T>;

    sendVerificationEmail(email: string, context?: ContextBlock): Promise<any>;
}
