import {expect} from "chai";
import {BasicUserSchema} from "./basic-user";
import {StringSchema} from "./string";

describe('BasicUserModel', function () {
    describe('BasicUserSchema', function () {
        it('should be truly', function () {
            expect(BasicUserSchema).eql({
                type: 'object',
                properties: {
                    username: StringSchema,
                    password: StringSchema,
                    email: StringSchema
                },
                required: ['username', 'password']
            })
        });
    });
});