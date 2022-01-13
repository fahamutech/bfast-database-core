import {expect} from "chai";
import {RuleContextSchema} from "./rule-context";
import {StringSchema} from "./string";

describe('RuleContextModel', function () {
    describe('RuleContextSchema', function () {
        it('should be truly', function () {
            expect(RuleContextSchema).eql({
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
                    }
                },
                required: ['applicationId']
            });
        });
    });
});