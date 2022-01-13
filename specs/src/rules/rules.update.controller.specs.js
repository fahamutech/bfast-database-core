const {mongoRepSet, config} = require('../../mock.config.js');
const {before, after} = require('mocha');
const {should, expect, assert} = require("chai");
const {handleCreateRules, handleUpdateRules, handleQueryRules} = require("../../../dist");

describe('RulesController', function () {
    let mongoMemoryReplSet;
    const leo = new Date();
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        await mongoMemoryReplSet.start();
        const r = await handleCreateRules({
                createProduct: [
                    {name: 'xyz', price: 50, status: 'new', id: 'xyz'},
                    {name: 'wer', price: 100, status: 'new'},
                    {name: 'poi', price: 30, status: 'new'},
                    {name: 'poipo', price: 60, status: 'old'},
                    {
                        id: 'ethan',
                        name: 'josh', price: 50, status: 'old', flags: {
                            a: {
                                q: 1,
                                g: 2
                            }
                        }
                    },
                    {id: 'josh', name: 'ethan', price: 60, a: {b: 10}, createdAt: leo, 'updatedAt': leo},
                ]
            }, {errors: {}},
            config,
            null
        );
        should().exist(r);
        should().exist(r.createProduct);
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });
    describe('update', function () {
        it('should updateUserInStore a document by id', async function () {
            const results = await handleUpdateRules({
                    updateProduct: {
                        id: 'xyz',
                        update: {
                            $set: {
                                name: 'apple'
                            }
                        },
                        return: []
                    }
                },
                {errors: {}},
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
        it('should updateUserInStore a document by id with dates', async function () {
            const results = await handleUpdateRules({
                    updateProduct: {
                        id: 'josh',
                        update: {
                            $set: {
                                name: 'ethan'
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
        it('should updateUserInStore a documents by filter', async function () {
            const results = await handleUpdateRules({
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
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(3);
        });
        it('should updateUserInStore bulk documents by filter', async function () {
            const results = await handleUpdateRules({
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
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(10);
        });
        it('should updateUserInStore many documents by id', async function () {
            const results = await handleUpdateRules({
                    updateProduct: [
                        {
                            id: 'xyz',
                            update: {
                                $set: {
                                    name: 'apple',
                                    status: 'new'
                                }
                            },
                        },
                    ]
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
        it('should not updateUserInStore many documents when empty filter exist', async function () {
            const results = await handleUpdateRules({
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
                config,
                null
            );
            assert(results.updateProduct === undefined);
            assert(results.errors !== undefined);
            assert(results.errors['updateUserInStore.Product']['message'] === 'Empty map is not supported in updateUserInStore rule');
        });
        it('should not updateUserInStore objects by empty filter', async function () {
            const results = await handleUpdateRules({
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
                config,
                null
            );
            assert(results.updateProduct === undefined);
            assert(results.errors !== undefined);
            assert(results.errors['updateUserInStore.Product']['message'] === 'Empty map is not supported in updateUserInStore rule');
        });
        it('should updateUserInStore when empty filter and id is supplied', async function () {
            const results = await handleUpdateRules({
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
                config,
                null
            );
            should().exist(results.updateProduct);
            assert(results.updateProduct.modified === 1);
        });
        it('should create document if not exist and upsert is true, with query by id', async function () {
            const _date = new Date().toISOString();
            const results = await handleUpdateRules({
                    updateProduct: {
                        id: 'xyz123',
                        update: {
                            $set: {
                                name: 'apple',
                                createdAt: _date,
                                updatedAt: _date,
                            }
                        },
                        upsert: true,
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
        it('should not create document if not exist and upsert is false, with query by id', async function () {
            const _date = new Date();
            const results = await handleUpdateRules({
                    updateProduct: {
                        id: '667yu90',
                        update: {
                            $set: {
                                name: 'doe_apple',
                                createdAt: _date,
                                updatedAt: _date,
                            }
                        },
                        upsert: false,
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(0)
        });
        it('should create documents if not exist and upsert is true, with query by filter', async function () {
            const results = await handleUpdateRules(
                {
                    updateProduct: {
                        filter: {
                            status: 'mixer'
                        },
                        update: {
                            $set: {
                                name: 'apple',
                                createdAt: new Date()
                            }
                        },
                        upsert: true,
                        return: []
                    }
                },
                {errors: {}},
                config,
                null
            );
            const r = await handleQueryRules(
                {
                    queryProduct: {
                        filter: {
                            status: 'mixer'
                        },
                        return: []
                    }
                },
                {errors: {}},
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
        it('should increment a number field if $inc operation provided and field exist in a doc ', async function () {
            // const _date = new Date();
            const results = await handleUpdateRules({
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
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
        it('should increment a number field if $inc operation provided and field exist in a inner doc ', async function () {
            const results = await handleUpdateRules({
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
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
        it('should increment near and far field in a doc ', async function () {
            // const _date = new Date();
            const results = await handleUpdateRules({
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
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
        it('should increment not exist field', async function () {
            const results = await handleUpdateRules({
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
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
        it('should increment not exist inner field', async function () {
            const results = await handleUpdateRules({
                    updateProduct: {
                        id: 'josh',
                        update: {
                            $set: {
                                updatedAt: leo
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
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
        it('should not increment non number field', async function () {
            const results = await handleUpdateRules({
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
                config,
                null
            );
            should().not.exist(results.updateProduct);
            should().exist(results.errors['updateUserInStore.Product']);
        });
        it('should upsert and increment field when upsert is true and use id', async function () {
            const results = await handleUpdateRules({
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
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
        it('should upsert and increment field when upsert is true and use filter', async function () {
            const results = await handleUpdateRules({
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
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
    });
    describe('$unset', function () {
        it('should removeDataInStore field in a document', async function () {
            const results = await handleUpdateRules({
                    updateProduct: {
                        id: 'xyz',
                        update: {
                            $unset: {
                                status: 1
                            }
                        },
                        return: []
                    }
                },
                {errors: {}},
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
        it('should removeDataInStore embedded field in a document', async function () {
            const results = await handleUpdateRules({
                    updateProduct: {
                        id: 'ethan',
                        update: {
                            $unset: {
                                'flags.a.q': 1
                            }
                        },
                        return: []
                    }
                },
                {errors: {}},
                config,
                null
            );
            should().exist(results.updateProduct);
            expect(results.updateProduct.modified).equal(1);
        });
    });
});
