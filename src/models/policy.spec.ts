import {expect} from "chai";
import {PolicyDataSchema} from "./policy";
import {StringSchema} from "./string";

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
