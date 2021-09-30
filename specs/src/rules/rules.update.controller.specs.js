const {mongoRepSet, config} = require('../../mock.config');
const {before, after} = require('mocha');
const {should, expect, assert} = require("chai");
const {
    RulesController,
    DatabaseFactory,
    AuthController,
    DatabaseController,
    SecurityController,
    UpdateRuleController
} = require("../../../dist");

describe('RulesController', function () {

    let _rulesController = new RulesController();
    let mongoMemoryReplSet;
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        await mongoMemoryReplSet.start();
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
                        {id: 'josh', name: 'ethan', price: 60, a: {b: 10}, createdAt: 'leo', 'updatedAt': 'leo'},
                    ]
                }, {errors: {}},
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
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
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.name).equal('apple');
            expect(results.updateProduct.price).equal(50);
        });
        it('should update a documents by filter', async function () {
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
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct).length(3);
            expect(results.updateProduct.map(x1 => x1.status)).to.have.members(['old', 'old', 'old']);
            expect(results.updateProduct.map(x1 => x1.name)).to.have.members(['apple', 'apple', 'apple']);
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
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(Array.isArray(results.updateProduct)).equal(true);
            expect(results.updateProduct.length).equal(2);
            expect(results.updateProduct[0]).length(4);
            results.updateProduct[0].map(_e3 => expect(typeof _e3.id).equal('string'));
            expect(results.updateProduct[1]).length(4);
        });
        it('should update many documents by id', async function () {
            const results = await _rulesController.handleUpdateRules({
                    updateProduct: [
                        {
                            id: 'xyz',
                            // filter: {},
                            update: {
                                $set: {
                                    name: 'apple',
                                    status: 'new'
                                }
                            },
                        },
                        // {
                        //     filter: {
                        //         status: 'new'
                        //     },
                        //     update: {
                        //         $set: {
                        //             name: 'apple',
                        //             status: 'old'
                        //         }
                        //     },
                        // }
                    ]
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            // console.log(results.updateProduct)
            should().exist(results.updateProduct);
            expect(Array.isArray(results.updateProduct)).equal(true);
            expect(results.updateProduct.length).equal(1);
            expect(results.updateProduct[0].id).equal('xyz');
            // expect(results.updateProduct[1]).length(4);
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
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
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
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
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
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            assert(results.updateProduct['id'] === 'xyz');
            assert(typeof results.updateProduct === 'object');
        });
        it('should create document if not exist and upsert is true, with query by id', async function () {
            const _date = new Date();
            const results = await _rulesController.handleUpdateRules({
                    updateProduct: {
                        id: 'xyz123',
                        update: {
                            $set: {
                                name: 'apple',
                                _created_at: _date,
                                _updated_at: _date,
                            }
                        },
                        upsert: true,
                        return: []
                    }
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.name).equal('apple');
            expect(results.updateProduct.id).equal('xyz123');
            should().exist(results.updateProduct.createdAt);
            should().exist(results.updateProduct.createdAt);
            expect(results.updateProduct).eql({
                id: 'xyz123',
                name: 'apple',
                createdAt: _date,
                // createdBy: null,
                updatedAt: _date
            });
        });
        it('should not create document if not exist and upsert is false, with query by id', async function () {
            const _date = new Date();
            const results = await _rulesController.handleUpdateRules({
                    updateProduct: {
                        id: '667yu90',
                        update: {
                            $set: {
                                name: 'doe_apple',
                                _created_at: _date,
                                _updated_at: _date,
                            }
                        },
                        upsert: false,
                        return: []
                    }
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().not.exist(results.updateProduct);
        });
        it('should create documents if not exist and upsert is true, with query by filter', async function () {
            const results = await _rulesController.handleUpdateRules(
                {
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
                },
                {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            const r = await _rulesController.handleQueryRules({
                    queryProduct: {
                        filter: {
                            status: 'mixer'
                        },
                        return: []
                    }
                }, {errors: {}},
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct).length(1);
            expect(r.queryProduct[0].status).equal('mixer');
            expect(typeof r.queryProduct[0].id).equal('string');
        });

        it('should increment a number field if $inc operation provided and field exist in a doc ', async function () {
            // const _date = new Date();
            const results = await _rulesController.handleUpdateRules({
                    updateProduct: {
                        id: 'josh',
                        update: {
                            $inc: {
                                price: 10
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.price).equal(70);
        });
        it('should increment a number field if $inc operation provided and field exist in a inner doc ', async function () {
            // const _date = new Date();
            const results = await _rulesController.handleUpdateRules({
                    updateProduct: {
                        id: 'josh',
                        update: {
                            $inc: {
                                a: {
                                    b: 1
                                }
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.a.b).equal(11);
        });
        it('should increment near and far field in a doc ', async function () {
            // const _date = new Date();
            const results = await _rulesController.handleUpdateRules({
                    updateProduct: {
                        id: 'josh',
                        update: {
                            $inc: {
                                price: 10,
                                a: {
                                    b: 10
                                }
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.a.b).equal(21);
            expect(results.updateProduct.price).equal(80);
        });
        it('should increment not exist field', async function () {
            // const _date = new Date();
            const results = await _rulesController.handleUpdateRules({
                    updateProduct: {
                        id: 'josh',
                        update: {
                            $inc: {
                                c: 10
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.c).equal(10);
        });
        it('should increment not exist inner field', async function () {
            const results = await _rulesController.handleUpdateRules({
                    updateProduct: {
                        id: 'josh',
                        update: {
                            $set: {
                                updatedAt: 'leo'
                            },
                            $inc: {
                                c: 10,
                                e: {
                                    a: 10
                                }
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.c).equal(20);
            expect(results.updateProduct.e.a).equal(10);
            expect(results.updateProduct).eql({
                id: 'josh',
                name: 'ethan',
                price: 80,
                a: {b: 21},
                c: 20,
                e: {a: 10},
                createdAt: 'leo',
                createdBy: null,
                updatedAt: 'leo'
            })
        });
        it('should not increment non number field', async function () {
            const results = await _rulesController.handleUpdateRules({
                    updateProduct: {
                        id: 'josh',
                        update: {
                            $inc: {
                                name: 10
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.name).equal('ethan');
        });
        it('should upsert and increment field when upsert is true and use id', async function () {
            const results = await _rulesController.handleUpdateRules({
                    updateProduct: {
                        id: 'josh334',
                        upsert: true,
                        update: {
                            $inc: {
                                age: 10
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.age).equal(10);
        });
        it('should upsert and increment field when upsert is true and use filter', async function () {
            const results = await _rulesController.handleUpdateRules({
                    updateProduct: {
                        filter: {
                            name: 'night'
                        },
                        upsert: true,
                        update: {
                            $inc: {
                                age: 10
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                new UpdateRuleController(),
                new AuthController(),
                new DatabaseController(),
                new SecurityController(),
                new DatabaseFactory(),
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct[0].age).equal(10);
            expect(results.updateProduct[0].name).equal('night');
        });
    });
});
