import {comparePlainTextWithSaltedHash, generateToken, generateUUID, saltHashPlainText, verifyToken} from "./security";
import {expect} from "chai";
import {loadEnv} from "../../utils";

let saltedText, token, options
describe('SecurityController', function () {
    beforeEach(() => options = loadEnv())
    describe('saltHashPlainText', function () {
        it('should create a salted hash from plain text', async function () {
            saltedText = await saltHashPlainText('test')
            expect(saltedText).be.a('string')
        });
    });
    describe('comparePlainTextWithSaltedHash', function () {
        it('should compare plain and salted', async function () {
            const a = await comparePlainTextWithSaltedHash('test', saltedText)
            expect(a).equal(true)
        });
        it('should return false if not match', async function () {
            const a = await comparePlainTextWithSaltedHash('testw', saltedText)
            expect(a).equal(false)
        });
    });
    describe('generateToken', function () {
        it('should generate jwt token', async function () {
            const data = {uid: 'test'}
            token = await generateToken(data, options)
            expect(token).be.a('string')
        });
    });
    describe('verifyToken', function () {
        it('should verify valid token', async function () {
            const data = await verifyToken(token, options)
            expect(data.uid).eql('test')
        });
        it('should fail if token not valid', function (done) {
            verifyToken('abc', options).catch(reason => {
                expect(reason.message).eql('jwt malformed')
                done()
            })
        });
        it('should fail if token expired', function (done) {
            const data = {a: 1}
            generateToken(data, options, 0).then(tkn => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => verifyToken(tkn, options).then(resolve).catch(reject), 100)
                });
            }).catch(reason => {
                expect(reason.message).eql('jwt expired')
                done()
            });
        });
    });
    describe('generateUUID', function () {
        it('should generate random uuid', function () {
            const uuid = generateUUID()
            expect(uuid).be.a('string')
        });
    });
});
