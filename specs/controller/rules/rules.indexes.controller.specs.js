const {getRulesController, mongoRepSet} = require('../../mock.config');
const {before, after} = require('mocha');
const assert = require('assert');

describe('RulesController::Indexes Unit Test', function () {
    let _rulesController;
    let mongoMemoryReplSet;
    before(async function () {
        this.timeout(10000000000000000);
        mongoMemoryReplSet = mongoRepSet();
        _rulesController = await getRulesController(mongoMemoryReplSet);
        await _rulesController.handleCreateRules({
            createProduct: {
                name: 'apple',
                price: 20
            }
        }, {errors: {}});
    });
    after(async function () {
        this.timeout(10000000000000000);
        await mongoMemoryReplSet.stop();
    });

    it('should add indexes to a domain', async function () {
        const results = await _rulesController.handleIndexesRule({
            context: {
                useMasterKey: true
            },
            indexProduct: {
                add: [
                    {field: "name"}
                ]
            }
        }, {errors: {}});
        assert(results.indexProduct !== undefined);
        assert(results.indexProduct.add !== undefined);
        assert(results.indexProduct.add === 'Indexes added');
    });
    it('should list all added indexes', async function () {
        const result = await _rulesController.handleIndexesRule({
            context: {
                useMasterKey: true
            },
            indexProduct: {
                list: {}
            }
        }, {errors: {}});
        assert(result.indexProduct !== undefined);
        assert(result.indexProduct.list !== undefined);
        assert(Array.isArray(result.indexProduct.list));
        assert(result.indexProduct.list.length === 2);
    });
    it('should drop all user defined indexes', async function () {
        const result = await _rulesController.handleIndexesRule({
            context: {
                useMasterKey: true
            },
            indexProduct: {
                remove: {}
            }
        }, {errors: {}});
        assert(result.indexProduct !== undefined);
        assert(result.indexProduct.remove !== undefined);
        assert(result.indexProduct.remove === true);
    });
});
