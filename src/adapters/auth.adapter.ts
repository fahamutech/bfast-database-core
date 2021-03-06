import {BasicUserAttributesModel} from '../model/basic-user-attributes.model';
import {ContextBlock} from '../model/rules.model';

export abstract class AuthAdapter {
  abstract signUp<T extends BasicUserAttributesModel>(userModel: T, context?: ContextBlock): Promise<T>;

  abstract signIn<T extends BasicUserAttributesModel>(userModel: T, context?: ContextBlock): Promise<T>;

  abstract resetPassword(email: string, context?: ContextBlock): Promise<any>;

  abstract updatePassword(password: string, context?: ContextBlock): Promise<any>;

  abstract deleteUser(context?: ContextBlock): Promise<any>;

  abstract update<T extends BasicUserAttributesModel>(userModel: T, context?: ContextBlock): Promise<T>;

  abstract sendVerificationEmail(email: string, context?: ContextBlock): Promise<any>;
}
