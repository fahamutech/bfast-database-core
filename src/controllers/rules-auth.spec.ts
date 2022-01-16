import {handleAuthenticationRule, handleDeleteRules} from "./rules";
import {assert, expect, should} from "chai";
import {RuleResponse} from "../models/rule-response";
import {Rules} from "../models/rules";
import {AuthFactory} from "../factories/auth.factory";
import {loadEnv} from "../utils/env";
import {extractResultFromServer} from "bfast";

let options;

async function clearUsers() {
    const a = await handleDeleteRules({
        context: {useMasterKey: true},
        delete_User: {
            filter: {updatedAt: {$exists: true}}
        }
    }, {errors: {}}, loadEnv(), null)
    extractResultFromServer(a, 'delete', '_User')
}

describe('RulesAuthController', function () {
    beforeEach(() => options = loadEnv())
    before(async () => await clearUsers())
    after(async () => await clearUsers())
    const ruleResponse: RuleResponse = {errors: {}}
    const authFactory = new AuthFactory()
    describe('SignUp', function () {
        it('should register user', async function () {
            const rules: Rules = {
                auth: {
                    signUp: {
                        username: 'test',
                        email: 'test@doe.com',
                        password: 'test'
                    }
                }
            }
            const results = await handleAuthenticationRule(rules, ruleResponse, authFactory, options)
            assert(results.auth['signUp'] !== undefined);
            assert(results.auth['signUp'] !== null);
            assert(results.auth['signUp'].username === 'test');
            assert(results.auth['signUp'].email === 'test@doe.com');
            assert(results.auth['signUp'].id !== null);
            assert(results.auth['signUp'].objectId !== null);
            assert(typeof results.auth['signUp'].id === "string");
            assert(typeof results.auth['signUp'].token === "string");
        });
        it('should return error message when email is not present', async function () {
            const results = await handleAuthenticationRule(
                {
                    auth: {
                        signUp: {
                            username: 'doe',
                            password: 'doe',
                        }
                    }
                },
                {errors: {}}, authFactory, options
            );
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            assert(results.errors['auth.signUp'].message === 'Email required');
        });
        it('should return error message when password is not present', async function () {
            const rule = {auth: {signUp: {email: 'doe@doe.com', username: 'doe'}}}
            // @ts-ignore
            const results = await handleAuthenticationRule(rule, {errors: {}}, authFactory, options);
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            expect(results.errors['auth.signUp'].message).equal('Password required');
        });
        it('should return error message when signUp is empty object', async function () {
            const rule = {auth: {signUp: {}}}
            // @ts-ignore
            const results = await handleAuthenticationRule(rule, {errors: {}}, authFactory, options);
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            expect(results.errors['auth.signUp'].message).equal('Email required');
        });
        it('should return error message when signUp is null', async function () {
            const rule = {auth: {signUp: null}}
            const results = await handleAuthenticationRule(rule, {errors: {}}, authFactory, options);
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            expect(results.errors['auth.signUp'].message).equal('Email required');
        });
        it('should return error message when signUp is undefined', async function () {
            const rule = {auth: {signUp: undefined}}
            const results = await handleAuthenticationRule(rule, {errors: {}}, authFactory, options);
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            expect(results.errors['auth.signUp'].message).equal('Email required');
        });
    });
    describe('SignIn', function () {
        it('should return signed user data', async function () {
            const rule = {auth: {signIn: {username: 'test', password: 'test'}}}
            const results = await handleAuthenticationRule(rule, {errors: {}}, authFactory, options);
            should().exist(results.auth.signIn);
            expect(results.auth.signIn).be.a('object');
            expect(results.auth.signIn.username).equal('test');
            expect(results.auth.signIn.email).equal('test@doe.com');
            expect(results.auth.signIn.token).be.a('string');
            expect(results.auth.signIn.id).be.a('string');
        });
        it('should return error message when username not supplied', async function () {
            const rule = {auth: {signIn: {password: 'doe'}}}
            // @ts-ignore
            const results = await handleAuthenticationRule(rule, {errors: {}}, authFactory, options);
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signIn']);
            expect(results.errors['auth.signIn'].message).equal('Username required');
        });
        it('should return error message when password not supplied', async function () {
            const rule = {auth: {signIn: {username: 'doe'}}}
            // @ts-ignore
            const results = await handleAuthenticationRule(rule, {errors: {}}, authFactory, options);
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signIn']);
            expect(results.errors['auth.signIn'].message).equal('Password required');
        });
        it('should return error message when signIn is empty', async function () {
            const rule = {auth: {signIn: {}}}
            // @ts-ignore
            const results = await handleAuthenticationRule(rule, {errors: {}}, authFactory, options);
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signIn']);
            expect(results.errors['auth.signIn'].message).equal('Username required');
        });
    });
});

describe('handlePolicyRule', function () {

});