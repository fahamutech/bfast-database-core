const {config, mongoRepSet, sendRuleRequest} = require('../../mock.config');
const {expect, should} = require('chai');

describe('Rest authentication', function () {
    let mongoMemoryReplSet
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        await mongoMemoryReplSet.start();
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });
    describe('signUp', function () {
        it('should create a new user', async function () {
            const user = {
                applicationId: config.applicationId,
                auth: {
                    signUp: {
                        username: 'joshua',
                        password: 'joshua',
                        email: 'joshua@gmail.com'
                    }
                }
            };
            const data = await sendRuleRequest(user);
            should().exist(data);
            expect(typeof data).equal('object');
            should().exist(data['auth'].signUp);
            should().exist(data['auth'].signUp.token);
            expect(typeof data['auth'].signUp.token).equal('string');
            expect(data['auth'].signUp).haveOwnProperty('username');
            should().exist(data['auth'].signUp.email);
            should().exist(data['auth'].signUp.id);
            should().exist(data['auth'].signUp.createdAt);
            should().exist(data['auth'].signUp.updatedAt);
            expect(data['auth'].signUp.username).equal('joshua');
            expect(data['auth'].signUp.email).equal('joshua@gmail.com');
        });
        it('should not create user for same username', async function () {
            const user = {
                applicationId: config.applicationId,
                auth: {
                    signUp: {
                        username: 'joshua',
                        password: 'joshua',
                        email: 'joshua234@gmail.com'
                    }
                }
            };
            const data = await sendRuleRequest(user);
            // console.log(data);
            should().not.exist(data.auth);
            should().exist(data.errors['auth.signUp']);
            expect(data.errors['auth.signUp'].message).equal('User already exist');
        });
        it('should not create user for same email', async function () {
            const user = {
                applicationId: config.applicationId,
                auth: {
                    signUp: {
                        username: 'joshua34w',
                        password: 'joshua',
                        email: 'joshua@gmail.com'
                    }
                }
            };
            const data = await sendRuleRequest(user);
            should().not.exist(data.auth);
            should().exist(data.errors['auth.signUp']);
            expect(data.errors['auth.signUp'].message).equal('User already exist');
        });
    });
    describe('reset', function () {
        it('should send a reset password email', async function () {
            const user = {
                applicationId: config.applicationId,
                auth: {
                    reset: {
                        email: 'joshua2@gmail.com'
                    }
                }
            };
            const data = await sendRuleRequest(user);
            should().exist(data);
            expect(typeof data).equal("object");
            should().not.exist(data['auth']);
            expect(typeof data['errors']).equal("object");
            expect(data.errors['auth.reset'].message).equal('Reset not supported yet');
        });
    });
    describe('signIn', function () {
        it('should signIn a registered user', async function () {
            const user = {
                applicationId: config.applicationId,
                auth: {
                    signIn: {
                        username: 'joshua',
                        password: 'joshua',
                    }
                }
            };
            const data = await sendRuleRequest(user);
            should().exist(data);
            should().exist(data['auth'].signIn);
            should().exist(data['auth'].signIn.token);
            expect(typeof data['auth'].signIn.token).equal('string');
            should().exist(data['auth'].signIn.username);
            should().exist(data['auth'].signIn.email);
            should().exist(data['auth'].signIn.id);
            should().exist(data['auth'].signIn.id);
            should().exist(data['auth'].signIn.createdAt);
            should().exist(data['auth'].signIn.updatedAt);
            expect(data['auth'].signIn.username).equal('joshua');
            expect(data['auth'].signIn.email).equal('joshua@gmail.com');
        });
        it('should not signIn if username is wrong', async function () {
            const user = {
                applicationId: config.applicationId,
                auth: {
                    signIn: {
                        username: 'joshua9990897yuuhj',
                        password: 'joshua',
                    }
                }
            };
            const data = await sendRuleRequest(user);
            should().exist(data);
            should().not.exist(data['auth']);
            expect(typeof data['errors']).equal("object");
            expect(data.errors['auth.signIn'].message).equal('Username is not valid');
        });
        it('should not signIn if password is wrong', async function () {
            const user = {
                applicationId: config.applicationId,
                auth: {
                    signIn: {
                        username: 'joshua',
                        password: 'joshua87yugu',
                    }
                }
            };
            const data = await sendRuleRequest(user);
            should().exist(data);
            should().not.exist(data['auth']);
            expect(typeof data['errors']).equal("object");
            expect(data.errors['auth.signIn'].message).equal('Password is not valid');
        });
    });
});
