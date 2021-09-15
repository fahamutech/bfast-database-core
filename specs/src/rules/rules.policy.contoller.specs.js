const {mongoRepSet, config} = require('../../mock.config');
const {before, after} = require('mocha');
const {assert, expect, should} = require('chai');
const {
    RulesController,
    DatabaseFactory,
    AuthController,
    DatabaseController,
    SecurityController
} = require("../../../dist");

describe('policy', function () {

    let _rulesController = new RulesController();
    let mongoMemoryReplSet
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        await mongoMemoryReplSet.start();
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });

    describe('add', function () {
        it('should return added policy when masterKey is valid', async function () {
            const results = await _rulesController.handleAuthorizationRule({
                    context: {
                        useMasterKey: true
                    },
                    policy: {
                        add: {
                            'query.*': 'return false;'
                        }
                    }
                }, {errors: {}},
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config
            );
            should().exist(results.policy);
            expect(results.policy?.add?.['query.*']).haveOwnProperty('createdBy');
            expect(results.policy?.add?.['query.*']).haveOwnProperty('createdAt');
            expect(results.policy?.add?.['query.*']).haveOwnProperty('updatedAt');
            delete results.policy?.add?.['query.*']?.createdBy;
            delete results.policy?.add?.['query.*']?.createdAt;
            delete results.policy?.add?.['query.*']?.updatedAt;
            expect(results.policy).eql({
                add: {
                    'query.*': {
                        id: 'query.*',
                        ruleId: 'query.*',
                        ruleBody: 'return false;'
                    }
                }
            });
        });
        it('should return error message when masterKey is invalid', async function () {
            const results = await _rulesController.handleAuthorizationRule({
                    context: {
                        useMasterKey: false
                    },
                    policy: {
                        rules: {
                            'query.*': 'return false;'
                        }
                    }
                }, {errors: {}},
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config
            );
            should().exist(results.errors['policy']);
            should().not.exist(results['policy']);
            expect(results.errors['policy']['message']).equal('policy rule require masterKey');
        });
    });
    describe('list', function () {
        before(async function () {
            await _rulesController.handleAuthorizationRule({
                    context: {
                        useMasterKey: true
                    },
                    policy: {
                        add: {
                            'query.*': 'return false;'
                        }
                    }
                }, {errors: {}},
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config
            );
        });
        after(async function () {
            await _rulesController.handleAuthorizationRule({
                    context: {
                        useMasterKey: true
                    },
                    delete_Policy: {
                        filter: {
                            ruleId: 'query.*'
                        }
                    }
                }, {errors: {}},
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config
            );
        });
        it('should return list of policy when masterKey is valid', async function () {
            const results = await _rulesController.handleAuthorizationRule({
                    context: {
                        useMasterKey: true
                    },
                    policy: {
                        list: {}
                    }
                }, {errors: {}},
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config
            );
            assert(results.policy !== undefined);
            assert(results.policy.list !== undefined);
            assert(Array.isArray(results.policy['list']));
            assert(results.policy['list'].length === 1);
            assert(results.policy['list'][0]['ruleId'] === 'query.*');
        });
    });
    describe('remove', function () {
        before(async function () {
            await _rulesController.handleAuthorizationRule({
                    context: {
                        useMasterKey: true
                    },
                    policy: {
                        add: {
                            'read.category': 'return false;'
                        }
                    }
                }, {errors: {}},
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config
            );
        });
        after(async function () {
            await _rulesController.handleAuthorizationRule({
                    context: {
                        useMasterKey: true
                    },
                    delete_Policy: {
                        filter: {
                            ruleId: 'read.category'
                        }
                    }
                }, {errors: {}},
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config
            );
        });
        it('should remove a policy when masterKey is valid', async function () {
            const results = await _rulesController.handleAuthorizationRule({
                    context: {
                        useMasterKey: true
                    },
                    policy: {
                        remove: {
                            ruleId: 'read.category'
                        }
                    }
                }, {errors: {}},
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config
            );
            should().exist(results.policy);
            should().exist(results.policy.remove);
            expect(results.policy.remove[0].id).equal('read.category');
        });
        it('should return empty map when remove non exist rule', async function () {
            const results = await _rulesController.handleAuthorizationRule({
                    context: {
                        useMasterKey: true
                    },
                    policy: {
                        remove: {
                            ruleId: 'create.category'
                        }
                    }
                }, {errors: {}},
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config
            );
            should().exist(results.policy);
            expect(results.policy.remove).eql([]);
        });
    });

});
