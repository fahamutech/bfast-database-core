import {handleDeleteRules} from "./rules.controller";
import {loadEnv} from "../utils/env";
import {extractResultFromServer} from "bfast";
import {signIn, signUp} from "./auth";
import {AuthFactory} from "../factories/auth.factory";
import {expect} from "chai";

let options
const ruleContext = {}
const authAdaptor = new AuthFactory()
const date = new Date()

async function clearUsers() {
    options = loadEnv()
    const a = await handleDeleteRules({
        context: {useMasterKey: true},
        delete_User: {
            filter: {
                updatedAt: {$exists: true}
            }
        }
    }, {errors: {}}, options, null)
    extractResultFromServer(a, 'delete', '_User')
}

function validaUserData(a: any) {
    expect(a.id).be.a('string')
    expect(a.token).be.a('string')
    delete a.id
    delete a.token
    expect(a).eql({
        name: 'test test',
        email: 'test@test.com',
        username: 'test',
        createdAt: date,
        updatedAt: date,
        createdBy: null,
        emailVerified: false
    })
}

describe('AuthController', function () {
    beforeEach(() => options = loadEnv())
    before(async () => await clearUsers())
    after(async () => await clearUsers())
    describe('signUp', function () {
        it('should create a user in data store', async function () {
            const user = {
                username: 'test', email: 'test@test.com', password: 'test', name: 'test test',
                updatedAt: date, createdAt: date
            }
            const a = await signUp(user, authAdaptor, ruleContext, options)
            validaUserData(a)
        });
        it('should fail if user with same email and username exist', function (done) {
            const user = {
                username: 'test', email: 'test@test.com', password: 'test', name: 'test test',
                updatedAt: date, createdAt: date
            }
            signUp(user, authAdaptor, ruleContext, options).catch(reason => {
                expect(reason).eql({
                    message: 'User already exist'
                })
                done()
            })
        });
        it('should fail if user with same email and different username', function (done) {
            const user = {
                username: 'test2', email: 'test@test.com', password: 'test', name: 'test test',
                updatedAt: date, createdAt: date
            }
            signUp(user, authAdaptor, ruleContext, options).catch(reason => {
                expect(reason).eql({
                    message: 'User already exist'
                })
                done()
            })
        });
        it('should fail if user with same username and different email', function (done) {
            const user = {
                username: 'test', email: 'test2@test.com', password: 'test', name: 'test test',
                updatedAt: date, createdAt: date
            }
            signUp(user, authAdaptor, ruleContext, options).catch(reason => {
                expect(reason).eql({
                    message: 'User already exist'
                })
                done()
            })
        });
        it('should fail if no email', function (done) {
            const user = {
                username: 'test', password: 'test', name: 'test test', updatedAt: date, createdAt: date
            }
            signUp(user, authAdaptor, ruleContext, options).catch(reason => {
                expect(reason).eql({
                    message: 'Email required'
                })
                done()
            })
        });
    });
    describe('signIn', function () {
        it('should sign in if user exist', async function () {
            const user = {username: 'test', password: 'test'}
            const a = await signIn(user, authAdaptor, ruleContext, options)
            validaUserData(a)
        });
        it('should return error if username not valid', function (done) {
            const user = {username: 'test4', password: 'test'}
            signIn(user, authAdaptor, ruleContext, options).catch(reason => {
                expect(reason.message).eql('Username is not valid')
                done()
            })
        });
        it('should return error if password not valid', function (done) {
            const user = {username: 'test', password: 'test34'}
            signIn(user, authAdaptor, ruleContext, options).catch(reason => {
                expect(reason.message).eql('Password is not valid')
                done()
            })
        });
    });
});