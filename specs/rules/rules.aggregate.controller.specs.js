const {getRulesController, mongoRepSet} = require('../mock.config');
const {before, after} = require('mocha');
const assert = require('assert');

describe('RulesController::Aggregation Unit Test', function () {
    let _rulesController;
    let mongoMemoryReplSet
    before(async function () {
        this.timeout(10000000000000000);
        mongoMemoryReplSet = mongoRepSet();
        _rulesController = await getRulesController(mongoMemoryReplSet);
        await _rulesController.handleCreateRules({
            createProduct: {
                name: 'xyz',
                age: 89
            }
        }, {errors: {}});
    });
    after(async function () {
        this.timeout(10000000000000000);
        await mongoMemoryReplSet.stop();
    });

    it('should perform aggregation for a specified domain', async function () {
        const results = await _rulesController.handleAggregationRules({
            context: {
                useMasterKey: false
            },
            aggregateProduct: [
                {
                    $match: {
                        name: 'xyz'
                    }
                }
            ]
        }, {errors: {}});
        assert(results.aggregateProduct !== undefined);
        assert(Array.isArray(results.aggregateProduct));
        assert(results.aggregateProduct.length === 1);
        assert(results.aggregateProduct[0].name === 'xyz');
        assert(results.aggregateProduct[0].age === 89);
        assert(typeof results.aggregateProduct[0].id === 'string');
    });
    it('should perform aggregation for a specified domain with company group id', async function () {
        const results = await _rulesController.handleAggregationRules({
            context: {
                useMasterKey: false
            },
            aggregateProduct: [
                {
                    $match: {
                        name: 'xyz'
                    }
                },
                {
                    $group: {
                        _id: {
                            name: '$name'
                        },
                        name: {$first: '$name'},
                        age: {$first: '$age'},
                    }
                }
            ]
        }, {errors: {}});
        assert(results.aggregateProduct !== undefined);
        assert(Array.isArray(results.aggregateProduct));
        assert(results.aggregateProduct.length === 1);
        assert(results.aggregateProduct[0].name === 'xyz');
        assert(results.aggregateProduct[0].age === 89);
        assert(typeof results.aggregateProduct[0].id === 'object');
    });
});
