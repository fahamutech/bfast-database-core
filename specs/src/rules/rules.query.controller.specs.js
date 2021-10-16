const {mongoRepSet, config} = require('../../mock.config');
const {createHash} = require('crypto');
const {expect, should, assert} = require('chai');
const {handleCreateRules, handleQueryRules, handleUpdateRules} = require("../../../dist");

describe('RulesController', function () {
    const datas = [
        {
            name: 'xyz',
            price: 60,
            tags: {a: 1, b: {c: 2}},
            status: 'new',
            id: 'xyzid',
            createdAt: 'test',
            updatedAt: 'test',
            createdBy: null
        },
        {
            id: 'ff',
            createdAt: 'leo',
            createdBy: null,
            members: [{email: 'e@e.e'}],
            name: 'tt project',
            pid: 'tt',
            updatedAt: 'leo',
            users: {email: 'e@e.e'}
        },
        {id: 'wer_id', name: 'wer', price: 100, status: 'new', createdAt: 'test', updatedAt: 'test', createdBy: null},
        {id: 'poi_id', name: 'poi', price: 50, status: 'new', createdAt: 'test', updatedAt: 'test', createdBy: null},
    ];
    let mongoMemoryReplSet;
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        await mongoMemoryReplSet.start();
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });
    describe('Query', function () {
        before(async function () {
            await handleCreateRules({
                    createProduct: datas,
                },
                {errors: {}},
                config,
                null
            );
        });
        // it('should return only cids when told', async function () {
        //     const _datas = JSON.parse(JSON.stringify(datas));
        //     const cids = await Promise.all(_datas.map(async x => {
        //         x._id = x.id;
        //         delete x.id;
        //         return Hash.of(Buffer.from(JSON.stringify(x)));
        //     }));
        //     const results = await _rulesController.handleQueryRules({
        //             queryProduct: {
        //                 filter: {
        //                     status: 'new'
        //                 },
        //                 cids: true,
        //                 return: []
        //             }
        //         }, {errors: {}},
        //         new AuthController(),
        //         new DatabaseController(),
        //         new SecurityController(),
        //         new DatabaseFactory(),
        //         config,
        //         null
        //     );
        //     expect(results.queryProduct).eql(cids);
        // });
        // it('should return only cids when told and ignore hashes', async function () {
        //     const _datas = JSON.parse(JSON.stringify(datas));
        //     const cids = await Promise.all(_datas.map(async x => {
        //         x._id = x.id;
        //         delete x.id;
        //         return Hash.of(Buffer.from(JSON.stringify(x)));
        //     }));
        //     const results = await _rulesController.handleQueryRules({
        //             queryProduct: {
        //                 filter: {
        //                     status: 'new'
        //                 },
        //                 hashes: true,
        //                 cids: true,
        //                 return: []
        //             }
        //         }, {errors: {}},
        //         new AuthController(),
        //         new DatabaseController(),
        //         new SecurityController(),
        //         new DatabaseFactory(),
        //         config,
        //         null
        //     );
        //     expect(results.queryProduct).eql(cids);
        // });
        // it('should return only cids when told and ignore hashes for single item', async function () {
        //     const _datas = JSON.parse(JSON.stringify(datas.filter(x => x.id === 'xyzid')));
        //     const cids = await Promise.all(_datas.map(async x => {
        //         x._id = x.id;
        //         delete x.id;
        //         return Hash.of(Buffer.from(JSON.stringify(x)));
        //     }));
        //     const results = await _rulesController.handleQueryRules({
        //             queryProduct: {
        //                 id: 'xyzid',
        //                 hashes: true,
        //                 cids: true,
        //                 return: []
        //             }
        //         }, {errors: {}},
        //         new AuthController(),
        //         new DatabaseController(),
        //         new SecurityController(),
        //         new DatabaseFactory(),
        //         config,
        //         null
        //     );
        //     expect(results.queryProduct).eql(cids[0]);
        // });
        it('should perform match for AND operation', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            name: 'xyz',
                            price: 60,
                            status: 'new'
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results);
            should().exist(results.queryProduct);
            expect(results.queryProduct).length(1);
            expect(results.queryProduct[0].id).equal('xyzid');
            expect(results.queryProduct[0].createdAt).equal('test');
            expect(results.queryProduct[0].updatedAt).equal('test');
        });
        it('should perform match for AND operation when field in data is in array', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            pid: 'tt',
                            users: {
                                email: 'e@e.e'
                            },
                            members: {
                                email: 'e@e.e'
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results);
            should().exist(results.queryProduct);
            expect(results.queryProduct).length(1);
            expect(results.queryProduct[0].id).equal('ff');
        });
        it('should return query result based on id', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        id: 'xyzid',
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            assert(results.queryProduct !== undefined);
            assert(results.queryProduct.name === 'xyz');
            assert(results.queryProduct.id === 'xyzid');
            assert(results.queryProduct.price === 60);
            assert(results.queryProduct.status === 'new');
        });
        it('should return null when id supplied is not exist', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        id: 'xyz1234hint',
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            assert(results.queryProduct === null);
        });
        it('should return query result based on filter', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            name: 'xyz'
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            should().exist(results.queryProduct[0]);
            expect(results.queryProduct[0].name).equal('xyz');
            expect(results.queryProduct[0].id).equal('xyzid');
            expect(results.queryProduct[0].price).equal(60);
            expect(results.queryProduct[0].status).equal('new');
        });
        it('should return query result based on filter and field not exist', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            customer: 'josh'
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            // console.log(results);
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(0);
            // expect(results.queryProduct[0].name).equal('xyz');
            // expect(results.queryProduct[0].id).equal('xyzid');
            // expect(results.queryProduct[0].price).equal(60);
            // expect(results.queryProduct[0].status).equal('new');
        });
        it('should limit size of the results', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {},
                        size: 1,
                        skip: 0,
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct).length(1);
        });
        it('should limit size of the results when filter applied', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            name: {
                                $fn: `return it.toString().length > 0`
                            }
                        },
                        size: 2,
                        skip: 0,
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct).length(2);
        });
        it('should perform basic query based on empty filter', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {},
                        return: ['name', 'price']
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(4);
            // expect(results.queryProduct).eql([
            //     {name: 'xyz', price: 60, id: 'xyzid', createdAt: 'test', updatedAt: 'test'},
            //     {
            //         id: 'ff',
            //         createdAt: 'leo',
            //         // createdBy: null,
            //         // members: [ { email: 'e@e.e' } ],
            //         name: 'tt project',
            //         price: undefined,
            //         // pid: 'tt',
            //         updatedAt: 'leo',
            //         // users: { email: 'e@e.e' }
            //     },
            //     {id: 'wer_id', name: 'wer', price: 100, createdAt: 'test', updatedAt: 'test'},
            //     {id: 'poi_id', name: 'poi', price: 50, createdAt: 'test', updatedAt: 'test'},
            // ])
        });
        it('should perform basic query based on empty filter with orderBy', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {},
                        orderBy: [{'name': 1}],
                        return: ["name"]
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(4);
        });
        it('should count object based on filter', async function () {
            const results = await handleQueryRules(
                {
                    queryProduct: {
                        filter: {
                            name: 'xyz'
                        },
                        count: true,
                    }
                },
                {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(typeof results.queryProduct).equal("number");
            expect(results.queryProduct).equal(1);
        });
        it('should count object based on empty filter', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {},
                        count: true,
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(typeof results.queryProduct).equal("number");
            expect(results.queryProduct).equal(4);
        });
        it('should perform basic query based on empty filter with local hashes supplied', async function () {
            const hash = createHash('sha256')
                .update(JSON.stringify({
                    name: 'poi',
                    price: 50,
                    id: 'poi_id',
                    createdAt: 'test',
                    updatedAt: 'test'
                }))
                .digest('hex');
            const localData = {
                [hash]: {
                    name: 'poi',
                    price: 50,
                    id: 'poi_id',
                    createdAt: 'test',
                    updatedAt: 'test'
                }
            }
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {},
                        hashes: Object.keys(localData),
                        return: ['name', 'price']
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(4);
            // expect(results.queryProduct[2]).equal(hash);
        });
        it('should perform query based on id if with local hashes supplied', async function () {
            const data = {
                name: 'poi',
                price: 50,
                id: 'poi_id',
                createdAt: 'test',
                updatedAt: 'test'
            };
            const hash = createHash('sha256')
                .update(JSON.stringify(data))
                .digest('hex');
            const localData = {
                [hash]: data
            }
            const results = await handleQueryRules({
                    queryProduct: {
                        id: 'poi_id',
                        filter: {},
                        hashes: Object.keys(localData),
                        return: ['name', 'price']
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            // expect(typeof results.queryProduct).equal('string');
            // expect(results.queryProduct).equal(hash);
        });
        it('should perform query when filter is in or format/array', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: [
                            {name: 'xyz'},
                            {name: 'poi'}
                        ],
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(2);
            // expect(results.queryProduct).eql([
            //     {
            //         name: 'xyz',
            //         price: 60,
            //         tags: {a: 1, b: {c: 2}},
            //         status: 'new',
            //         id: 'xyzid',
            //         createdAt: 'test',
            //         createdBy: null,
            //         updatedAt: 'test'
            //     },
            //     {
            //         id: 'poi_id', createdBy: null,
            //         name: 'poi', price: 50, status: 'new', createdAt: 'test',
            //         updatedAt: 'test'
            //     },
            // ]);
        });
        it('should perform query when filter is in or format/array and one query is false', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: [
                            {name: 'xyz'},
                            {name: 'joshua'}
                        ],
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(1);
            expect(results.queryProduct).eql([
                {
                    name: 'xyz',
                    tags: {a: 1, b: {c: 2}},
                    price: 60,
                    status: 'new',
                    id: 'xyzid',
                    createdAt: 'test',
                    createdBy: null,
                    updatedAt: 'test'
                },
            ]);
        });
        it('should perform count query when filter is in or format/array', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: [
                            {name: 'xyz'},
                            {name: 'poi'}
                        ],
                        count: true,
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(results.queryProduct).equal(2);
        });
        it('should return empty when and operation not met', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {name: 'xyz', tag: 'joshua'},
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(0);
        });
        it('should return docs when full doc supplied in query', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            name: 'xyz',
                            price: 60,
                            tags: {a: 1, b: {c: 2}},
                            status: 'new',
                            id: 'xyzid',
                            createdAt: 'test',
                            updatedAt: 'test'
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(1);
            expect(results.queryProduct).eql([
                {
                    name: 'xyz',
                    price: 60,
                    tags: {a: 1, b: {c: 2}},
                    status: 'new',
                    id: 'xyzid',
                    createdAt: 'test',
                    createdBy: null,
                    updatedAt: 'test'
                }
            ]);
        });
        it('should perform query with expression', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            price: {
                                $fn: `return (it === 50 || it === 100);`
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(2);
        });
        it('should order the results by asc when perform query with expression and orderBy provided', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            price: {
                                $fn: 'return true',
                                $orderBy: 'asc'
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(3);
            expect(results.queryProduct).eql([
                {
                    id: 'poi_id',
                    name: 'poi',
                    price: 50,
                    status: 'new',
                    createdAt: 'test',
                    createdBy: null,
                    updatedAt: 'test'
                },
                {
                    name: 'xyz',
                    price: 60,
                    tags: {a: 1, b: {c: 2}},
                    status: 'new',
                    id: 'xyzid',
                    createdAt: 'test',
                    createdBy: null,
                    updatedAt: 'test'
                },
                {
                    id: 'wer_id',
                    name: 'wer',
                    price: 100,
                    status: 'new',
                    createdAt: 'test',
                    createdBy: null,
                    updatedAt: 'test'
                },
            ]);
        });
        it('should order the results by asc when perform query with expression and orderBy provided and limit', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            price: {
                                $fn: 'return true',
                                $orderBy: 'asc',
                                $limit: 2,
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(2);
            expect(results.queryProduct).eql([
                {
                    id: 'poi_id',
                    name: 'poi',
                    price: 50,
                    status: 'new',
                    createdAt: 'test',
                    createdBy: null,
                    updatedAt: 'test'
                },
                {
                    name: 'xyz',
                    price: 60,
                    tags: {a: 1, b: {c: 2}},
                    status: 'new',
                    id: 'xyzid',
                    createdAt: 'test',
                    createdBy: null,
                    updatedAt: 'test'
                }
            ]);
        });
        it('should order the results by asc when perform query with expression and orderBy provided and skip', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            price: {
                                $fn: 'return true',
                                $orderBy: 'asc',
                                $skip: 2,
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(1);
            expect(results.queryProduct).eql([
                {
                    id: 'wer_id',
                    name: 'wer',
                    price: 100,
                    status: 'new',
                    createdAt: 'test',
                    createdBy: null,
                    updatedAt: 'test'
                },
            ]);
        });
        it('should order the results by dsc when perform query with expression and orderBy provided', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            price: {
                                $fn: 'return true',
                                $orderBy: 'desc'
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(3);
            expect(results.queryProduct).eql([
                {
                    id: 'wer_id',
                    name: 'wer',
                    price: 100,
                    status: 'new',
                    createdBy: null,
                    createdAt: 'test',
                    updatedAt: 'test'
                },
                {
                    name: 'xyz',
                    price: 60,
                    tags: {a: 1, b: {c: 2}},
                    status: 'new',
                    id: 'xyzid',
                    createdAt: 'test',
                    createdBy: null,
                    updatedAt: 'test'
                },
                {
                    id: 'poi_id',
                    name: 'poi',
                    price: 50,
                    status: 'new',
                    createdAt: 'test',
                    createdBy: null,
                    updatedAt: 'test'
                },
            ]);
        });
        it('should deep match', async function () {
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            tags: {
                                b: {
                                    c: 2
                                }
                            }
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(1);
            expect(results.queryProduct).eql([
                {
                    name: 'xyz',
                    price: 60,
                    tags: {
                        a: 1,
                        b: {
                            c: 2
                        }
                    },
                    status: 'new',
                    id: 'xyzid',
                    createdAt: 'test',
                    createdBy: null,
                    updatedAt: 'test'
                }
            ]);
        });
        it('should not fetch old data in a node if that node updated from main data object', async function () {
            await handleCreateRules({
                    createProduct: {
                        id: 'oldnode',
                        createdAt: 'leo',
                        updatedAt: 'leo',
                        bei: 5000
                    },
                }, {errors: {}},
                config,
                null
            );
            await handleUpdateRules({
                    updateProduct: {
                        id: 'oldnode',
                        update: {
                            $set: {
                                bei: 4000
                            }
                        }
                    },
                },
                {errors: {}},
                config,
                null,
            );
            const results = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            bei: 5000,
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            // console.log(results);
            should().exist(results);
            should().exist(results.queryProduct);
            expect(results.queryProduct).length(0);
            expect(results.queryProduct).eql([]);
            const results1 = await handleQueryRules({
                    queryProduct: {
                        filter: {
                            bei: 4000,
                        },
                        return: []
                    }
                }, {errors: {}},
                config,
                null
            );
            // console.log(results1);
            should().exist(results1);
            should().exist(results1.queryProduct);
            expect(results1.queryProduct).length(1);
            expect(results1.queryProduct[0].id).equal('oldnode');
            expect(results1.queryProduct[0].bei).equal(4000);
        });
    });
});
