import {expect, should} from "chai";
import {handleCreateRules, handleDeleteRules} from "../controllers/rules";
import {config, databaseFactory, sendRuleRequest} from "../test";
import {loadEnv} from "../utils/env";
import {extractResultFromServer} from "bfast";

async function clearData() {
    const a = await handleDeleteRules({
        context:{useMasterKey: true},
        deletetest: {
            filter: {
                updatedAt: {$exists: true}
            }
        },
        delete_User: {
            filter: {
                updatedAt: {$exists: true}
            }
        }
    }, {errors: {}}, databaseFactory(), loadEnv(), null)
    extractResultFromServer(a, 'delete', 'test')
    extractResultFromServer(a, 'delete', '_User')
}

describe('RulesWebservice', function () {
    before(async () => {
        await clearData()
        const crate = {
            createtest: [
                {
                    name: 'xps',
                    price: 10
                },
                {
                    name: 'hp',
                    price: 20
                }
            ]
        };
        const a = await handleCreateRules(
            crate, {errors: {}}, databaseFactory(), loadEnv(), null);
        extractResultFromServer(a, 'create', 'test')
    });
    after(async () => await clearData());
    describe('query', function () {
        it('should perform query with expression', async function () {
            const query = {
                applicationId: config.applicationId,
                token: null,
                querytest: {filter: {name: {$ne: 'xps'}}, return: []}
            };
            const data = await sendRuleRequest(query);
            should().exist(data);
            should().exist(data.querytest);
            expect(data.querytest).length(1);
            expect(data.querytest[0].name).equal('hp');
        });
    });
    describe('policy', function () {
        describe('add', function () {
            it('should add a permission policy to a resource url', async function () {
                const authorization = {
                    applicationId: config.applicationId,
                    masterKey: config.masterKey,
                    policy: {
                        add: {
                            "create.Product": `const uid = context.uid;return auth === true;`,
                        }
                    }
                };
                const data = await sendRuleRequest(authorization);
                should().exist(data);
                expect(typeof data).equal("object");
                expect(typeof data['policy']).equal("object");
                should().exist(data['policy'].add);
                expect(typeof data['policy'].add).equal("object");
                expect(typeof data['policy'].add['create.Product']).equal("object");
                expect(data['policy'].add['create.Product'].ruleId).equal("create.Product");
                expect(data['policy'].add['create.Product'].ruleBody).equal("const uid = context.uid;return auth === true;");
                expect(data['policy'].add['create.Product'].id).equal('create.Product');
            });
        });
        describe('list', function () {
            it('should return saved policies', async function () {
                const authorization = {
                    applicationId: config.applicationId,
                    masterKey: config.masterKey,
                    policy: {
                        list: {}
                    }
                };
                const data = await sendRuleRequest(authorization);
                should().exist(data);
                expect(typeof data).equal("object");
                expect(typeof data['policy']).equal("object");
                expect(Array.isArray(data.policy.list)).equal(true);
                expect(data.policy.list).length(1);
                expect(data.policy.list[0].id).equal('create.Product');
            });
        });
        describe('remove', function () {
            it('should removeDataInStore saved policy', async function () {
                const authorization = {
                    applicationId: config.applicationId,
                    masterKey: config.masterKey,
                    policy: {
                        remove: {
                            ruleId: 'create.Product'
                        }
                    }
                };
                const data = await sendRuleRequest(authorization);
                should().exist(data);
                expect(typeof data).equal("object");
                expect(typeof data['policy']).equal("object");
                should().exist(data.policy.remove);
                expect(Array.isArray(data.policy.remove)).equal(true);
                expect(data.policy.remove).length(1);
                expect(data.policy.remove[0].id).equal('create.Product');
            });
        });
    });
    describe('auth', function () {
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
});

