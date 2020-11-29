const {getRulesController, mongoRepSet} = require('../../mock.config');
const {before, after} = require('mocha');
const assert = require('assert');

describe('RulesController::Transaction Unit Test', function () {
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
    describe('RulesController::Transaction::Anonymous', function () {
        before(async function () {
            await _rulesController.handleCreateRules({
                createProduct: [
                    {name: 'xyz', price: 50, status: 'new', id: 'xyz'},
                    {name: 'zyx', price: 50, status: 'new', id: 'zyx'},
                    {name: 'uuu', price: 50, status: 'new', id: 'uuu'},
                ]
            }, {errors: {}});
        });
        it('should perform transaction', async function () {
            const results = await _rulesController.handleTransactionRule({
                transaction: {
                    commit: {
                        createProduct: [
                            {name: 'zxc', price: 100, status: 'new'},
                            {name: 'mnb', price: 30, status: 'new'},
                        ],
                        updateProduct: {
                            id: 'xyz',
                            return: [],
                            update: {
                                $set: {
                                    name: 'apple',
                                    price: 1000
                                }
                            }
                        },
                        deleteProduct: {
                            id: 'xyz'
                        },
                        queryProduct: {
                            filter: {},
                            return: []
                        }
                    }
                }
            }, {errors: {}});
            assert(results.transaction !== undefined);
            assert(results.transaction.commit !== undefined);
            assert(results.transaction.commit.createProduct !== undefined);
            assert(results.transaction.commit.queryProduct !== undefined);
            assert(results.transaction.commit.updateProduct !== undefined);
            assert(results.transaction.commit.updateProduct.name === 'apple');
            assert(results.transaction.commit.updateProduct.price === 1000);
            assert(results.transaction.commit.updateProduct.id === 'xyz');
            assert(results.transaction.commit.queryProduct !== undefined);
            assert(results.transaction.commit.deleteProduct !== undefined);
            assert(typeof results.transaction.commit.deleteProduct.id === 'string');
            assert(Array.isArray(results.transaction.commit.createProduct));
            assert(Array.isArray(results.transaction.commit.queryProduct));
            assert(results.transaction.commit.createProduct.length === 2);
            assert(results.transaction.commit.queryProduct.length === 5);

        });
        it('should perform transaction when update block is array', async function () {
            const results = await _rulesController.handleTransactionRule({
                transaction: {
                    commit: {
                        createProduct: [
                            {name: 'zxc', price: 100, status: 'new'},
                            {name: 'mnb', price: 30, status: 'new'},
                        ],
                        updateProduct: [
                            {
                                id: 'uuu',
                                return: [],
                                update: {
                                    $set: {
                                        name: 'apple',
                                        price: 1000
                                    }
                                }
                            },
                            {
                                id: 'zyx',
                                return: [],
                                update: {
                                    $set: {
                                        name: 'nokia',
                                        price: 5000
                                    }
                                }
                            }
                        ],
                        deleteProduct: {
                            id: 'uuu'
                        },
                        queryProduct: {
                            filter: {},
                            return: []
                        }
                    }
                }
            }, {errors: {}});
            assert(results.transaction !== undefined);
            assert(results.transaction.commit !== undefined);
            assert(results.transaction.commit.createProduct !== undefined);
            assert(results.transaction.commit.queryProduct !== undefined);
            assert(results.transaction.commit.updateProduct !== undefined);
            assert(Array.isArray(results.transaction.commit.updateProduct));
            assert(results.transaction.commit.updateProduct.length === 2);
            assert(results.transaction.commit.updateProduct[0].name === 'apple');
            assert(results.transaction.commit.updateProduct[0].price === 1000);
            assert(results.transaction.commit.updateProduct[0].id === 'uuu');
            assert(results.transaction.commit.updateProduct[1].name === 'nokia');
            assert(results.transaction.commit.updateProduct[1].price === 5000);
            assert(results.transaction.commit.updateProduct[1].id === 'zyx');
            assert(results.transaction.commit.queryProduct !== undefined);
            assert(results.transaction.commit.deleteProduct !== undefined);
            assert(typeof results.transaction.commit.deleteProduct.id === 'string');
            assert(Array.isArray(results.transaction.commit.createProduct));
            assert(Array.isArray(results.transaction.commit.queryProduct));
            assert(results.transaction.commit.createProduct.length === 2);
            assert(results.transaction.commit.queryProduct.length === 6);
        });
    });
});
