import {expect} from "chai";
import {PolicyAddSchema, PolicyDataSchema} from "./policy";
import {StringSchema} from "./string";
import {RuleContext, RuleContextSchema} from "./rule-context";
import {BFastOptions, BFastOptionsSchema} from "../bfast-option";

describe('PolicyModel', function () {
    describe('PolicySchema', function () {
        it('should be truly', function () {
            expect(PolicyDataSchema).eql({
                type: 'object',
                properties: {
                    id: StringSchema,
                    ruleId: StringSchema,
                    ruleBody: StringSchema
                },
                required: ['id', 'ruleId', 'ruleBody']
            })
        });
    });
});
