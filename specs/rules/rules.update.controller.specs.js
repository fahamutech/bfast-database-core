const {getRulesController, mongoRepSet} = require('../mock.config');
const {before, after} = require('mocha');
const assert = require('assert');
const {should, expect} = require("chai");

describe('RulesController', function () {
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
    describe('update', function () {
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
            expect(results.updateProduct).equal('ok');
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
            expect(results.updateProduct[0]).equal('ok');
            expect(results.updateProduct[1]).equal('ok');
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
            expect(results.updateProduct[1]).equal('ok');
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
        it('should create document if not exist and upsert is true, with query by id', async function () {
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
        it('should create document if not exist and upsert is true, with query by filter', async function () {
            const results = await _rulesController.handleUpdateRules({
                updateProduct: {
                    filter: {
                      status: 'mixer'
                    },
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
            const r = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {
                        status: 'mixer'
                    },
                    return: []
                }
            }, {errors: {}});
            assert(results.updateProduct !== null);
            expect(results.updateProduct).equal('ok');
            expect(r.queryProduct[0].status).equal('mixer');
            expect(typeof r.queryProduct[0].id).equal('string');
        });
    });
});
