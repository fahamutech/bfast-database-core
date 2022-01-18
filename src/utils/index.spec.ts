import {validateInput} from "./index";
import {StringSchema} from "../models/string";
import {PolicyDataSchema} from "../models/policy";
import {expect, should} from "chai";

describe('IndexUtil', function () {
    describe('Index', function () {
        it('should throw error', function (done) {
            validateInput({}, PolicyDataSchema, 'invalid').catch(reason => {
                expect(reason.message).equal('invalid');
                should().exist(reason.reason);
                done()
            })
        });
        it('should pass validation', async function () {
            const a = await validateInput('hi', StringSchema, 'valid')
            expect(a).equal(true)
        });
    });
});