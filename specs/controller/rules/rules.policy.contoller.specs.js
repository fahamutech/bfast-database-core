const {getRulesController, mongoRepSet} = require('../../mock.config');
const {before, after} = require('mocha');
const assert = require('assert');

describe('RulesController::Policy Unit Test', function () {
    let _rulesController;
    let mongoMemoryReplSet
    before(async function () {
        this.timeout(10000000000000000);
        mongoMemoryReplSet = mongoRepSet();
        _rulesController = await getRulesController(mongoMemoryReplSet);
    });
    after(async function () {
        this.timeout(10000000000000000);
        await mongoMemoryReplSet.stop();
    });

    describe('RulesController::Policy::Create', function () {
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
            }, {errors: {}});
            assert(results.policy !== undefined);
            assert(results.policy['add']['query.*'] !== undefined);
            assert(typeof results.policy['add']['query.*'] === 'object');
            assert(typeof results.policy['add']['query.*']['ruleId'] === 'string');
            assert(typeof results.policy['add']['query.*']['id'] === 'string');
            assert(results.policy['add']['query.*']['ruleId'] === 'query.*');
            assert(results.policy['add']['query.*']['ruleBody'] === 'return false;');
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
            }, {errors: {}});
            assert(results.errors['policy'] !== undefined);
            assert(results['policy'] === undefined);
            assert(results.errors['policy']['message'] === 'policy rule require masterKey');
        });
    });
    describe('RulesController::Policy::Query', function () {
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
            }, {errors: {}});
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
            }, {errors: {}});
        });
        it('should return list of policy when masterKey is valid', async function () {
            const results = await _rulesController.handleAuthorizationRule({
                context: {
                    useMasterKey: true
                },
                policy: {
                    list: {}
                }
            }, {errors: {}});
            assert(results.policy !== undefined);
            assert(results.policy.list !== undefined);
            assert(Array.isArray(results.policy['list']));
            assert(results.policy['list'].length === 1);
            assert(results.policy['list'][0]['ruleId'] === 'query.*');
        });
    });
    describe('RulesController::Policy::Remove', function () {
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
            }, {errors: {}});
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
            }, {errors: {}});
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
            }, {errors: {}});
            assert(results.policy !== undefined);
            assert(results.policy.remove !== undefined);
            assert(typeof results.policy['remove']['id'] === 'string');
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
            }, {errors: {}});
            assert(results.policy !== undefined);
            assert(results.policy.remove === null);
        });
    });

});
