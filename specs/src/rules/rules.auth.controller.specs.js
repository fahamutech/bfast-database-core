const {getRulesController, mongoRepSet} = require('../../mock.config');
const {assert, should} = require('chai');

describe('RulesController::Auth Unit Test', function () {

    let _rulesController;
    let mongoMemoryReplSet
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        _rulesController = await getRulesController(mongoMemoryReplSet);
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });

    describe('RulesController::Auth::SignUp', function () {
        it('should return registered user', async function () {
            const results = {errors: {}};
            await _rulesController.handleAuthenticationRule({
                auth: {
                    signUp: {
                        username: 'doe',
                        password: 'doe',
                        email: 'doe@doe.com'
                    }
                }
            }, results);
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
            const results = await _rulesController.handleAuthenticationRule({
                auth: {
                    signUp: {
                        username: 'doe',
                        password: 'doe',
                    }
                }
            }, {errors: {}});
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            assert(results.errors['auth.signUp'].message === 'Email required');
            assert(typeof results.errors['auth.signUp'].data === 'object');
        });
        it('should return error message when username is not present', async function () {
            const results = {errors: {}};
            await _rulesController.handleAuthenticationRule({
                auth: {
                    signUp: {
                        email: 'doe@doe.com',
                        password: 'doe',
                    }
                }
            }, results)
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            assert(results.errors['auth.signUp'].message === 'Username required');
            assert(typeof results.errors['auth.signUp'].data === 'object');
        });
        it('should return error message when password is not present', async function () {
            const results = {errors: {}};
            await _rulesController.handleAuthenticationRule({
                auth: {
                    signUp: {
                        email: 'doe@doe.com',
                        username: 'doe',
                    }
                }
            }, results)
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            assert(results.errors['auth.signUp'].message === 'Password required');
            assert(typeof results.errors['auth.signUp'].data === 'object');
        });
        it('should return error message when signUp is empty object', async function () {
            const results = {errors: {}};
            await _rulesController.handleAuthenticationRule({
                auth: {
                    signUp: {}
                }
            }, results)
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            assert(results.errors['auth.signUp'].message === 'Empty user is not supported');
            assert(typeof results.errors['auth.signUp'].data === 'object');
            assert(Object.keys(results.errors['auth.signUp'].data).length === 0);
        });
        it('should return error message when signUp is null', async function () {
            const results = {errors: {}};
            await _rulesController.handleAuthenticationRule({
                auth: {
                    signUp: null
                }
            }, results)
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            assert(results.errors['auth.signUp'].message === 'Invalid user data');
            assert(results.errors['auth.signUp'].data === null);
        });
        it('should return error message when signUp is undefined', async function () {
            const results = {errors: {}};
            await _rulesController.handleAuthenticationRule({
                auth: {
                    signUp: undefined
                }
            }, results)
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signUp']);
            assert(results.errors['auth.signUp'].message === 'Invalid user data');
            assert(results.errors['auth.signUp'].data === undefined);
        });
    });

    describe('SignIn', function () {
        before(async function () {
            const r = await _rulesController.handleAuthenticationRule({
                auth: {
                    signUp: {
                        username: 'doe2',
                        email: 'doedoe@gmail.com',
                        password: 'doe'
                    }
                }
            }, {errors: {}});
            should().exist(r.auth.signUp);
        });
        after(async function () {
            await _rulesController.handleDeleteRules({
                context: {
                    useMasterKey: true,
                },
                delete_User: {
                    filter: {
                        username: 'doe2'
                    }
                }
            }, {errors: {}});
        });
        it('should return signed user data', async function () {
            const results = await _rulesController.handleAuthenticationRule({
                auth: {
                    signIn: {
                        username: 'doe2',
                        password: 'doe'
                    }
                }
            }, {errors: {}});
            should().exist(results.auth.signIn);
            assert(typeof results.auth.signIn === 'object');
            assert(results.auth.signIn.username === 'doe2');
            assert(results.auth.signIn.email === 'doedoe@gmail.com');
            assert(typeof results.auth.signIn.token === 'string');
            assert(typeof results.auth.signIn.id === 'string');
        });
        it('should return error message when username not supplied', async function () {
            const results = await _rulesController.handleAuthenticationRule({
                auth: {
                    signIn: {
                        password: 'doe'
                    }
                }
            }, {errors: {}});
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signIn']);
            assert(results.errors['auth.signIn'].message === 'Username required');
            assert(typeof results.errors['auth.signIn'].data === 'object');
        });
        it('should return error message when password not supplied', async function () {
            const results = await _rulesController.handleAuthenticationRule({
                auth: {
                    signIn: {
                        username: 'doe'
                    }
                }
            }, {errors: {}});
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signIn']);
            assert(results.errors['auth.signIn'].message === 'Password required');
            assert(typeof results.errors['auth.signIn'].data === 'object');
        });
        it('should return error message when signIn is empty', async function () {
            const results = await _rulesController.handleAuthenticationRule({
                auth: {
                    signIn: {}
                }
            }, {errors: {}});
            should().not.exist(results.auth);
            should().exist(results.errors['auth.signIn']);
            assert(results.errors['auth.signIn'].message === 'Empty user is not supported');
            assert(typeof results.errors['auth.signIn'].data === 'object');
        });
    });
});
