const {getRulesController, mongoRepSet} = require('../mock.config');
const {before, after} = require('mocha');
const assert = require('assert');

describe('RulesController::Update Unit Test', function () {
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
    describe('RulesController::Update::Anonymous', function () {
        before(async function () {
            await _rulesController.handleCreateRules({
                createProduct: [
                    {name: 'xyz', price: 50, status: 'new', id: 'xyz'},
                    {name: 'wer', price: 100, status: 'new'},
                    {name: 'poi', price: 30, status: 'new'},
                    {name: 'poipo', price: 60, status: 'old'},
                ]
            }, {errors: {}});
        });
        it('should update a document by id', async function () {
            const results = await _rulesController.handleUpdateRules({
                updateProduct: {
                    id: 'xyz',
                    update: {
                        $set: {
                            name: 'apple'
                        }
                    },
                    return: []
                }
            }, {errors: {}});
            assert(results.updateProduct !== null);
            assert(results.updateProduct.name === 'apple');
            assert(results.updateProduct.price === 50);
        });
        it('should update a document by filter', async function () {
            const results = await _rulesController.handleUpdateRules({
                updateProduct: {
                    filter: {
                        status: 'new'
                    },
                    update: {
                        $set: {
                            name: 'apple',
                            status: 'old'
                        }
                    },
                    return: []
                }
            }, {errors: {}});
            assert(results.updateProduct !== null);
            assert(Array.isArray(results.updateProduct));
            assert(results.updateProduct.length === 3);
            assert(results.updateProduct[0].name === 'apple');
            assert(results.updateProduct[0].status === 'old');
            assert(results.updateProduct[1].name === 'apple');
            assert(results.updateProduct[1].status === 'old');
            assert(results.updateProduct[2].name === 'apple');
            assert(results.updateProduct[2].status === 'old');
        });
        it('should update many documents by filter', async function () {
            const results = await _rulesController.handleUpdateRules({
                updateProduct: [
                    {
                        filter: {
                            status: 'old'
                        },
                        update: {
                            $set: {
                                name: 'apple',
                                status: 'new'
                            }
                        },
                    },
                    {
                        filter: {
                            status: 'new'
                        },
                        update: {
                            $set: {
                                name: 'apple',
                                status: 'old'
                            }
                        },
                    }
                ]
            }, {errors: {}});
            assert(results.updateProduct !== undefined);
            assert(Array.isArray(results.updateProduct));
            assert(results.updateProduct.length === 2);
            assert(Array.isArray(results.updateProduct[0]));
            assert(Array.isArray(results.updateProduct[1]));
        });
        it('should update many documents by id', async function () {
            const results = await _rulesController.handleUpdateRules({
                updateProduct: [
                    {
                        id: 'xyz',
                        filter: {},
                        update: {
                            $set: {
                                name: 'apple',
                                status: 'new'
                            }
                        },
                    },
                    {
                        filter: {
                            status: 'new'
                        },
                        update: {
                            $set: {
                                name: 'apple',
                                status: 'old'
                            }
                        },
                    }
                ]
            }, {errors: {}});
            assert(results.updateProduct !== undefined);
            assert(Array.isArray(results.updateProduct));
            assert(results.updateProduct.length === 2);
            assert(results.updateProduct[0].id === 'xyz');
            assert(Array.isArray(results.updateProduct[1]));
        });
        it('should not update many documents when empty filter exist', async function () {
            const results = await _rulesController.handleUpdateRules({
                updateProduct: [
                    {
                        filter: {},
                        update: {
                            $set: {
                                name: 'apple',
                                status: 'new'
                            }
                        },
                    }
                ]
            }, {errors: {}});
            assert(results.updateProduct === undefined);
            assert(results.errors !== undefined);
            assert(results.errors['update.Product']['message'] === 'Empty map is not supported in update rule');
        });
        it('should not update objects by empty filter', async function () {
            const results = await _rulesController.handleUpdateRules({
                updateProduct: {
                    filter: {},
                    update: {
                        $set: {
                            name: 'apple'
                        }
                    },
                    return: []
                }
            }, {errors: {}});
            assert(results.updateProduct === undefined);
            assert(results.errors !== undefined);
            assert(results.errors['update.Product']['message'] === 'Empty map is not supported in update rule');
        });
        it('should update when empty filter and id is supplied', async function () {
            const results = await _rulesController.handleUpdateRules({
                updateProduct: {
                    id: 'xyz',
                    filter: {},
                    update: {
                        $set: {
                            name: 'apple'
                        }
                    },
                    return: []
                }
            }, {errors: {}});
            assert(results.updateProduct !== undefined);
            assert(results.updateProduct['id'] === 'xyz');
            assert(typeof results.updateProduct === 'object');
        });
        it('should create document if not exist and upsert is true', async function () {
            const results = await _rulesController.handleUpdateRules({
                updateProduct: {
                    id: 'xyz123',
                    update: {
                        $set: {
                            name: 'apple',
                            _created_at: new Date()
                        }
                    },
                    upsert: true,
                    return: []
                }
            }, {errors: {}});
            assert(results.updateProduct !== null);
            assert(results.updateProduct.name === 'apple');
            assert(results.updateProduct.id === 'xyz123');
            assert(results.updateProduct.createdAt !== null);
            assert(results.updateProduct.createdAt !== undefined);
        });
    });
});
