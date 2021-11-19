const {mongoRepSet, config} = require('../../mock.config.mjs');
const {before, after} = require('mocha');
const {assert, should, expect} = require('chai');
const {handleCreateRules, handleDeleteRules} = require("../../../dist");

describe('RulesController::Delete Unit Test', function () {
    let mongoMemoryReplSet;
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        await mongoMemoryReplSet.start();
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });
    describe('RulesController::Delete::Anonymous', function () {
        before(async function () {
            await handleCreateRules({
                    createProduct: [
                        {name: 'xyz', price: 50, status: 'new', id: 'xyz'},
                        {name: 'wer', price: 100, status: 'new'},
                        {name: 'poi', price: 30, status: 'new'},
                        {id: '16b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', name: '1'},
                        {id: 'a', name: '2'},
                        {id: 'b', name: '3'},
                    ]
                }, {errors: {}},
                config,
                null
            );
        });
        it('should delete a document by id', async function () {
            const results = await handleDeleteRules({
                    deleteProduct: {
                        id: 'xyz',
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.deleteProduct);
            expect(results.deleteProduct[0].id).equal('xyz');
        });
        it('should delete a document by filter', async function () {
            const results = await handleDeleteRules({
                    deleteProduct: {
                        filter: {
                            name: 'poi'
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.deleteProduct);
            expect(Array.isArray(results.deleteProduct)).equal(true);
            expect(results.deleteProduct.length).equal(1);
            expect(typeof results.deleteProduct[0].id === "string").equal(true);
        });
        it('should delete documents given many ids in filter', async function () {
            const results = await handleDeleteRules({
                    deleteProduct: {
                        filter: {
                            id: {
                                $in: ['16b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', 'a', 'b']
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.deleteProduct);
            expect(Array.isArray(results.deleteProduct)).equal(true);
            expect(results.deleteProduct.length).equal(3);
            expect(results.deleteProduct.map(x => x.id)).to.be.members(
                ['16b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', 'a', 'b']
            );
        });
        it('should not delete objects by empty filter', async function () {
            const results = await handleDeleteRules({
                    deleteProduct: {
                        filter: {},
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            assert(results.deleteProduct === undefined);
            assert(results.errors !== undefined);
            assert(results.errors['delete.Product']['message'] === 'Empty filter map is not supported in delete rule');
        });
    });
});
