import {BasicUserAttributesModel} from '../model/basic-user-attributes.model';
import {ContextBlock} from '../model/rules.model';

export interface AuthAdapter {
  signUp<T extends BasicUserAttributesModel>(userModel: T, context?: ContextBlock): Promise<T>;

  signIn<T extends BasicUserAttributesModel>(userModel: T, context?: ContextBlock): Promise<T>;

  resetPassword(email: string, context?: ContextBlock): Promise<any>;

  // updatePassword(password: string, context?: ContextBlock): Promise<any>;

  deleteUser(context?: ContextBlock): Promise<any>;

  update<T extends BasicUserAttributesModel>(userModel: T, context?: ContextBlock): Promise<T>;

  sendVerificationEmail(email: string, context?: ContextBlock): Promise<any>;
}
