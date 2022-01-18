import {Basic} from './basic';
import {StringSchema} from "./string";

export type BasicUser = Basic & {
    username?: string;
    email?: string;
    password?: string;
    token?: string;
    emailVerified?: boolean;
}


export const BasicUserSchema = {
    type: 'object',
    properties: {
        username: StringSchema,
        password: StringSchema,
        email: StringSchema
    },
    required: ['username','password']
}