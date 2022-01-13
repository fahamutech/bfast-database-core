import {expect} from "chai";
import {StringSchema} from "./string";

describe('StringModel', function () {
    describe('StringSchema', function () {
        it('should be truly', function () {
            expect(StringSchema).eql({
                type: 'string',
                minLength: 1
            })
        });
    });
});