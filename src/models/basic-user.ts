import {Basic} from './basic';

export type BasicUser = Basic & {
  username?: string;
  email?: string;
  password?: string;
  token?: string;
  emailVerified?: boolean;
}
