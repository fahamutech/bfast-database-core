const {mongoRepSet, config} = require('../../mock.config');
const {assert, should, expect} = require('chai');
const {handleAuthenticationRule, AuthFactory, handleDeleteRules} = require("../../../dist");

describe('Auth Rule', function () {
    let mongoMemoryReplSet
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        await mongoMemoryReplSet.start();
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });

    describe('SignUp', function () {
        it('should return registered user', async function () {
            const results = {errors: {}};
            await handleAuthenticationRule({
                    auth: {
                        signUp: {
                            username: 'doe',
                            password: 'doe',
                            email: 'doe@doe.com'
                        }
                    }
                },
                results,
                new AuthFactory(),
                config
            );
            assert(results.auth['signUp'] !== undefined);
            assert(results.auth['signUp'] !== null);
            assert(results.auth['signUp'].username === 'doe');
            assert(results.auth['signUp'].email === 'doe@doe.com');
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
                {errors: {}},
                new AuthFactory(),
                config
            );
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            assert(results.errors['auth.signUp'].message === 'Email required');
            assert(typeof results.errors['auth.signUp'].data === 'string');
        });
        it('should return error message when username is not present', async function () {
            const results = {errors: {}};
            await handleAuthenticationRule(
                {
                    auth: {
                        signUp: {
                            email: 'doe@doe.com',
                            password: 'doe',
                        }
                    }
                },
                results,
                new AuthFactory(),
                config
            )
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            assert(results.errors['auth.signUp'].message === 'Username required');
            assert(typeof results.errors['auth.signUp'].data === 'string');
        });
        it('should return error message when password is not present', async function () {
            const results = {errors: {}};
            await handleAuthenticationRule({
                    auth: {
                        signUp: {
                            email: 'doe@doe.com',
                            username: 'doe',
                        }
                    }
                },
                results,
                new AuthFactory(),
                config
            );
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            assert(results.errors['auth.signUp'].message === 'Password required');
            assert(typeof results.errors['auth.signUp'].data === 'string');
        });
        it('should return error message when signUp is empty object', async function () {
            const results = {errors: {}};
            await handleAuthenticationRule({
                    auth: {
                        signUp: {}
                    }
                }, results,
                new AuthFactory(),
                config
            );
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            assert(results.errors['auth.signUp'].message === 'Empty user is not supported');
            assert(typeof results.errors['auth.signUp'].data === 'string');
        });
        it('should return error message when signUp is null', async function () {
            const results = {errors: {}};
            await handleAuthenticationRule({
                    auth: {
                        signUp: null
                    }
                }, results,
                new AuthFactory(),
                config
            );
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            assert(results.errors['auth.signUp'].message === 'Invalid user data');
        });
        it('should return error message when signUp is undefined', async function () {
            const results = {errors: {}};
            await handleAuthenticationRule({
                    auth: {
                        signUp: undefined
                    }
                },
                results,
                new AuthFactory(),
                config
            );
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            assert(results.errors['auth.signUp'].message === 'Invalid user data');
        });
    });

    describe('SignIn', function () {
        before(async function () {
            const r = await handleAuthenticationRule({
                    auth: {
                        signUp: {
                            username: 'doe2',
                            email: 'doedoe@gmail.com',
                            password: 'doe'
                        }
                    }
                },
                {errors: {}},
                new AuthFactory(),
                config
            );
            should().exist(r.auth.signUp);
        });
        after(async function () {
            await handleDeleteRules({
                    context: {
                        useMasterKey: true,
                    },
                    delete_User: {
                        filter: {
                            username: 'doe2'
                        }
                    }
                },
                {errors: {}},
                config,
                null
            );
        });
        it('should return signed user data', async function () {
            const results = await handleAuthenticationRule({
                    auth: {
                        signIn: {
                            username: 'doe2',
                            password: 'doe'
                        }
                    }
                },
                {errors: {}},
                new AuthFactory(),
                config
            );
            // console.log(results)
            should().exist(results.auth.signIn);
            assert(typeof results.auth.signIn === 'object');
            assert(results.auth.signIn.username === 'doe2');
            assert(results.auth.signIn.email === 'doedoe@gmail.com');
            assert(typeof results.auth.signIn.token === 'string');
            assert(typeof results.auth.signIn.id === 'string');
        });
        it('should return error message when username not supplied', async function () {
            const results = await handleAuthenticationRule({
                    auth: {
                        signIn: {
                            password: 'doe'
                        }
                    }
                },
                {errors: {}},
                new AuthFactory(),
                config
            );
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signIn']);
            expect(results.errors['auth.signIn'].message).equal('Username required');
            expect(typeof results.errors['auth.signIn'].data).equal('string');
        });
        it('should return error message when password not supplied', async function () {
            const results = await handleAuthenticationRule({
                    auth: {
                        signIn: {
                            username: 'doe'
                        }
                    }
                },
                {errors: {}},
                new AuthFactory(),
                config
            );
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signIn']);
            expect(results.errors['auth.signIn'].message).equal('Password required');
            expect(typeof results.errors['auth.signIn'].data).equal('string');
        });
        it('should return error message when signIn is empty', async function () {
            const results = await handleAuthenticationRule(
                {
                    auth: {
                        signIn: {}
                    }
                },
                {errors: {}},
                new AuthFactory(),
                config
            );
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signIn']);
            expect(results.errors['auth.signIn'].message).equal('Empty user is not supported');
            expect(typeof results.errors['auth.signIn'].data).equal('string');
        });
    });
});
