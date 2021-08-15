const {getRulesController, mongoRepSet} = require('../../mock.config');
const {before, after} = require('mocha');
const {assert, should, expect} = require('chai');

describe('Transaction', function () {
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
    describe('commit', function () {
        before(async function () {
            await _rulesController.handleCreateRules({
                createProduct: [
                    {name: 'xyz', price: 50, status: 'new', id: 'xyz', createdAt: 'leo', updatedAt: 'leo'},
                    {name: 'zyx', price: 50, status: 'new', id: 'zyx', createdAt: 'leo', updatedAt: 'leo'},
                    {name: 'uuu', price: 50, status: 'new', id: 'uuu', createdAt: 'leo', updatedAt: 'leo'},
                ]
            }, {errors: {}});
        });
        it('should perform transaction', async function () {
            const results = await _rulesController.handleBulkRule({
                transaction: {
                    commit: {
                        createProduct: [
                            {id: 't1', createdAt: 'leo', updatedAt: 'leo', name: 'zxc', price: 100, status: 'new'},
                            {id: 't2', createdAt: 'leo', updatedAt: 'leo', name: 'mnb', price: 30, status: 'new'},
                        ],
                        updateProduct: {
                            id: 'xyz',
                            return: [],
                            update: {
                                $set: {
                                    name: 'apple',
                                    price: 1000,
                                    updatedAt: 'leo'
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
            should().exist(results.transaction);
            should().exist(results.transaction.commit);
            const _r = {...results.transaction.commit}
            delete _r.queryProduct;
            expect(_r).eql({
                errors: {},
                createProduct: [
                    {id: 't1'},
                    {id: 't2'},
                ],
                updateProduct: {
                    name: 'apple', price: 1000, status: 'new', id: 'xyz', createdAt: 'leo', updatedAt: 'leo'
                },
                deleteProduct: [
                    {id: 'xyz'}
                ],
            });
            should().exist(results.transaction.commit.createProduct);
            should().exist(results.transaction.commit.queryProduct);
            should().exist(results.transaction.commit.updateProduct);
            expect(results.transaction.commit.updateProduct.name).equal('apple');
            expect(results.transaction.commit.updateProduct.price).equal(1000);
            expect(results.transaction.commit.updateProduct.id).equal('xyz');
            should().exist(results.transaction.commit.queryProduct);
            should().exist(results.transaction.commit.deleteProduct);
            expect(typeof results.transaction.commit.deleteProduct[0].id).equal('string');
            expect(Array.isArray(results.transaction.commit.createProduct)).equal(true);
            expect(Array.isArray(results.transaction.commit.queryProduct)).equal(true);
            expect(results.transaction.commit.createProduct).length(2);
            expect(results.transaction.commit.queryProduct).length(5);
        });
        it('should perform transaction when update block is array', async function () {
            const results = await _rulesController.handleBulkRule({
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
            should().exist(results.transaction);
            should().exist(results.transaction.commit);
            should().exist(results.transaction.commit.createProduct);
            should().exist(results.transaction.commit.queryProduct);
            should().exist(results.transaction.commit.updateProduct);
            expect(Array.isArray(results.transaction.commit.updateProduct)).equal(true);
            expect(results.transaction.commit.updateProduct).length(2);
            expect(results.transaction.commit.updateProduct[0].name).equal('apple');
            expect(results.transaction.commit.updateProduct[0].price).equal(1000);
            expect(results.transaction.commit.updateProduct[0].id).equal('uuu');
            expect(results.transaction.commit.updateProduct[1].name).equal('nokia');
            expect(results.transaction.commit.updateProduct[1].price).equal(5000);
            expect(results.transaction.commit.updateProduct[1].id).equal('zyx');
            should().exist(results.transaction.commit.queryProduct);
            should().exist(results.transaction.commit.deleteProduct);
            expect(results.transaction.commit.deleteProduct[0].id).equal('uuu');
            expect(Array.isArray(results.transaction.commit.createProduct)).equal(true);
            expect(Array.isArray(results.transaction.commit.queryProduct)).equal(true);
            expect(results.transaction.commit.createProduct).length(2);
            expect(results.transaction.commit.queryProduct).length(6);
        });
        it('should perform transaction if save to already exist documents', async function () {
            const results = await _rulesController.handleBulkRule({
                transaction: {
                    commit: {
                        createProduct: [
                            {id: 'doe', name: 'zxc', price: 100, status: 'new', createdAt: 'leo', updatedAt: 'leo'},
                            {id: 'doe2', name: 'mnb', price: 30, status: 'new', createdAt: 'leo', updatedAt: 'leo'},
                        ],
                        updateProduct: {
                            id: 'xyz',
                            return: [],
                            update: {
                                $set: {
                                    name: 'apple',
                                    price: 1000,
                                    updatedAt: 'leo'
                                }
                            }
                        },
                        queryProduct: {
                            filter: {},
                            return: []
                        }
                    }
                },
            }, {errors: {}});
            should().exist(results.transaction);
            should().not.exist(results.errors.transaction);
            const _r = {...results.transaction.commit}
            delete _r.queryProduct;
            expect(_r).eql({
                errors: {},
                createProduct: [
                    {id: 'doe'},
                    {id: 'doe2'},
                ],
                updateProduct: null
            });
        });
    });
});