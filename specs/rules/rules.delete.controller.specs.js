const {getRulesController, mongoRepSet} = require('../mock.config');
const {before, after} = require('mocha');
const assert = require('assert');

describe('RulesController::Delete Unit Test', function () {
    this.timeout(10000000000000000);
    let _rulesController;
    let mongoMemoryReplSet;
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        _rulesController = await getRulesController(mongoMemoryReplSet);
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });
    describe('RulesController::Delete::Anonymous', function () {
        before(async function () {
            await _rulesController.handleCreateRules({
                createProduct: [
                    {name: 'xyz', price: 50, status: 'new', id: 'xyz'},
                    {name: 'wer', price: 100, status: 'new'},
                    {name: 'poi', price: 30, status: 'new'},
                    {id: '16b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', name: '1'},
                    {id: '2', name: '2'},
                    {id: '3', name: '3'},
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
        it('should delete documents given many ids in filter', async function () {
            const results = await _rulesController.handleDeleteRules({
                deleteProduct: {
                    filter: {
                        id: {
                            $in: ['16b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', '2', '3']
                        }
                    },
                    return: []
                }
            }, {errors: {}});
            assert(results.deleteProduct !== null);
            assert(Array.isArray(results.deleteProduct));
            assert(results.deleteProduct.length === 3);
            assert(typeof results.deleteProduct[0].id === 'string');
            assert(results.deleteProduct[0].id === '16b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b');
            assert(results.deleteProduct[1].id === '2');
            assert(results.deleteProduct[2].id === '3');
        });
        it('should not delete objects by empty filter', async function () {
            const results = await _rulesController.handleDeleteRules({
                deleteProduct: {
                    filter: {},
                    return: []
                }
            }, {errors: {}});
            assert(results.deleteProduct === undefined);
            assert(results.errors !== undefined);
            assert(results.errors['delete.Product']['message'] === 'Empty filter map is not supported in delete rule');
        });
    });
});
