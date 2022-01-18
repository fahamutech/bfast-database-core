import {StringSchema} from "./string";
import {RuleContext} from "./rule-context";
import {BFastOptions} from "../bfast-option";

export type Policy = {
    add?: {
        'create.*'?: string;
        'query.*'?: string;
        'update.*'?: string;
        'delete.*'?: string;
        [key: string]: string
    };
    list?: {};
    remove?: {
        ruleId: string;
    }
};

export type PolicyData = {
    id: string;
    ruleId: string;
    ruleBody: string;
};

export type PolicyAdd = {
    ruleId: string;
    rule: string;
    context: RuleContext;
    options: BFastOptions;
}

export const PolicyAddSchema = {

}

export const PolicyDataSchema = {
    type: 'object',
    properties: {
        id: StringSchema,
        ruleId: StringSchema,
        ruleBody: StringSchema
    },
    required: ['id','ruleId','ruleBody']
}