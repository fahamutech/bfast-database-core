const {getRulesController, mongoRepSet} = require('../mock.config');
const {before, after} = require('mocha');
const {assert, expect, should} = require('chai');

describe('policy', function () {
    this.timeout(10000000000000000);
    let _rulesController;
    let mongoMemoryReplSet
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        _rulesController = await getRulesController(mongoMemoryReplSet);
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
            }, {errors: {}});
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
            }, {errors: {}});
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
            }, {errors: {}});
            should().exist(results.policy);
            expect(results.policy.remove).eql([]);
        });
    });

});
