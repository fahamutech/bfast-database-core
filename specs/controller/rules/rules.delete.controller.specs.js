const {getRulesController, mongoRepSet} = require('../../mock.config');
const {before, after} = require('mocha');
const assert = require('assert');

describe('RulesController::Delete Unit Test', function () {
    let _rulesController;
    let mongoMemoryReplSet;
    before(async function () {
        this.timeout(10000000000000000);
        mongoMemoryReplSet = mongoRepSet();
        _rulesController = await getRulesController(mongoMemoryReplSet);
    });
    after(async function () {
        this.timeout(10000000000000000);
        await mongoMemoryReplSet.stop();
    });
    describe('RulesController::Delete::Anonymous', function () {
        before(async function () {
            await _rulesController.handleCreateRules({
                createProduct: [
                    {name: 'xyz', price: 50, status: 'new', id: 'xyz'},
                    {name: 'wer', price: 100, status: 'new'},
                    {name: 'poi', price: 30, status: 'new'},
                ]
            }, {errors: {}});
        });
        it('should delete a document by id', async function () {
            const results = await _rulesController.handleDeleteRules({
                deleteProduct: {
                    id: 'xyz',
                    return: []
                }
            }, {errors: {}});
            assert(results.deleteProduct !== null);
            assert(results.deleteProduct.id === 'xyz');
        });
        it('should delete a document by filter', async function () {
            const results = await _rulesController.handleDeleteRules({
                deleteProduct: {
                    filter: {
                        name: 'poi'
                    },
                    return: []
                }
            }, {errors: {}});
            assert(results.deleteProduct !== null);
            assert(Array.isArray(results.deleteProduct));
            assert(results.deleteProduct.length === 1);
            assert(typeof results.deleteProduct[0].id === 'string');
        });
        it('should not delete objects by empty filter', async function () {
            const results = await _rulesController.handleDeleteRules({
                deleteProduct: {
                    filter: {
                    },
                    return: []
                }
            }, {errors: {}});
            assert(results.deleteProduct === undefined);
            assert(results.errors !== undefined);
            assert(results.errors['delete.Product']['message'] === 'Empty filter map is not supported in delete rule');
        });
    });
});
