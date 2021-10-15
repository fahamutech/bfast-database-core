import {BasicAttributesModel} from './basic-attributes.model';

export interface BasicUserAttributesModel extends BasicAttributesModel {
  username?: string;
  email?: string;
  password?: string;
  token?: string;
  emailVerified?: boolean;
}
