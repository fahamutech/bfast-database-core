import {StringSchema} from "./string";

export type RuleContext = {
    return?: string[];
    uid?: string;
    auth?: boolean;
    applicationId?: string;
    masterKey?: string;
    useMasterKey?: boolean;
    storage?: {
        preserveName?: boolean
    }
};

export const RuleContextSchema = {
    type: 'object',
    properties: {
        return: {
            type: 'array',
            items: StringSchema
        },
        uid: StringSchema,
        auth: {type: 'boolean'},
        applicationId: StringSchema,
        masterKey: StringSchema,
        useMasterKey: {type: 'boolean'},
        storage: {
            type: 'object',
            properties: {
                preserveName: {type: 'boolean'}
            }
        },
    },
    required: ['applicationId']
}