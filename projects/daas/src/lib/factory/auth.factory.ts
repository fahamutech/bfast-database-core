import {AuthAdapter} from '../adapters/auth.adapter';
import {BasicUserAttributesModel} from '../model/basic-user-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {DatabaseController} from '../controllers/database.controller';
import {SecurityController} from '../controllers/security.controller';
import {EmailController} from '../controllers/email.controller';

export class AuthFactory implements AuthAdapter {
  private domainName = '_User';

  constructor(private readonly databaseController: DatabaseController,
              private readonly securityController: SecurityController) {
  }

  async resetPassword(email: string, context?: ContextBlock): Promise<any> {
    if (!email) {
      throw new Error('EmailFactory required');
    }
    throw new Error('Not implemented');
  }

  async signIn<T extends BasicUserAttributesModel>(userModel: T, context: ContextBlock): Promise<T> {
    const users = await this.databaseController.query(this.domainName, {
      filter: {
        username: userModel.username
      },
      return: []
    }, context, {
      bypassDomainVerification: true
    });
    if (users && Array.isArray(users) && users.length === 1) {
      const user = users[0];
      if (await this.securityController.comparePassword(userModel.password, user.password ? user.password : user._hashed_password)) {
        delete user.password;
        delete user._hashed_password;
        delete user._acl;
        delete user._rperm;
        delete user._wperm;
        user.token = await this.securityController.generateToken({uid: user.id});
        return user;
      } else {
        throw new Error('Username/Password is not valid');
      }
    } else {
      throw new Error('Username/Password is not valid');
    }
  }

  async signUp<T extends BasicUserAttributesModel>(userModel: T, context: ContextBlock): Promise<T> {
    userModel.password = await this.securityController.hashPlainText(userModel?.password);
    const user = await this.databaseController.writeOne(this.domainName, userModel, context, {
      bypassDomainVerification: true
    });
    delete user.password;
    user.token = await this.securityController.generateToken({uid: user?.id});
    return user;
  }

  async deleteUser(context?: ContextBlock): Promise<any> {
    return Promise.resolve(undefined);
  }

  async sendVerificationEmail(email: string, context?: ContextBlock): Promise<any> {
    return Promise.resolve(undefined);
  }

  async update<T extends BasicUserAttributesModel>(userModel: T, context?: ContextBlock): Promise<T> {
    return Promise.resolve(undefined);
  }

  // async updatePassword(password: string, context?: ContextBlock): Promise<any> {
  //     return Promise.resolve(undefined);
  // }
}
