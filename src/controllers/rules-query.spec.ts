import {assert, expect, should} from "chai";
import {createHash} from "crypto";
import {handleCreateRules, handleDeleteRules, handleQueryRules, handleUpdateRules} from "./rules";
import {loadEnv} from "../utils/env";
import {extractResultFromServer} from "bfast";
import {after, before} from "mocha";

const date = new Date()
const datas = [
    {
        name: 'xyz',
        price: 60,
        tags: {a: 1, b: {c: 2}},
        status: 'new',
        id: 'xyzid',
        createdAt: date,
        updatedAt: date,
        createdBy: null
    },
    {
        id: 'ff',
        createdAt: date,
        createdBy: null,
        members: [{email: 'e@e.e'}],
        name: 'tt project',
        pid: 'tt',
        updatedAt: date,
        users: {email: 'e@e.e'}
    },
    {id: 'wer_id', name: 'wer', price: 100, status: 'new', createdAt: date, updatedAt: date, createdBy: null},
    {id: 'poi_id', name: 'poi', price: 50, status: 'new', createdAt: date, updatedAt: date, createdBy: null},
];
let options;

async function createData() {
    const rule = {createProduct: datas}
    const a = await handleCreateRules(rule, {errors: {}}, loadEnv(), null);
    extractResultFromServer(a, 'create', 'Product')
}

async function clearData() {
    const a = await handleDeleteRules({
        deleteProduct: {filter: {updatedAt: {$exists: true}}}
    }, {errors: {}}, loadEnv(), null)
    extractResultFromServer(a, 'delete', 'Product')
}

describe('RulesQueryController', function () {
    beforeEach(() => options = loadEnv())
    before(async () => {
        await clearData()
        await createData()
    });
    after(async () => await clearData());
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
            options,
            null
        );
        should().exist(results);
        should().exist(results.queryProduct);
        expect(results.queryProduct).length(1);
        expect(results.queryProduct[0].id).eql('xyzid');
        expect(results.queryProduct[0].createdAt).eql(date);
        expect(results.queryProduct[0].updatedAt).eql(date);
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
            options,
            null
        );
        should().exist(results);
        should().exist(results.queryProduct);
        expect(results.queryProduct).length(1);
        expect(results.queryProduct[0].id).eql('ff');
    });
    it('should return query result based on id', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    id: 'xyzid',
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(results.queryProduct.name).eql('xyz');
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
            options,
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
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        should().exist(results.queryProduct[0]);
        expect(results.queryProduct[0].name).eql('xyz');
        expect(results.queryProduct[0].id).eql('xyzid');
        expect(results.queryProduct[0].price).eql(60);
        expect(results.queryProduct[0].status).eql('new');
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
            options,
            null
        );
        // console.log(results);
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(0);
        // expect(results.queryProduct[0].name).eql('xyz');
        // expect(results.queryProduct[0].id).eql('xyzid');
        // expect(results.queryProduct[0].price).eql(60);
        // expect(results.queryProduct[0].status).eql('new');
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
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct).length(1);
    });
    it('should limit size of the results when filter applied', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {
                        name: {
                            $exists: true
                        }
                    },
                    size: 2,
                    skip: 0,
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct).length(2);
    });
    it('should perform basic query based on empty filter', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {},
                    return: ['name', 'price']
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(4);
    });
    it('should perform basic query based on empty filter with orderBy', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {},
                    orderBy: [{'name': 1}],
                    return: ["name"]
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(4);
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
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(typeof results.queryProduct).eql("number");
        expect(results.queryProduct).eql(1);
    });
    it('should count object based on empty filter', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {},
                    count: true,
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(typeof results.queryProduct).eql("number");
        expect(results.queryProduct).eql(4);
    });
    it('should perform basic query based on empty filter with local hashes supplied', async function () {
        const hash = createHash('sha256')
            .update(JSON.stringify({
                name: 'poi',
                price: 50,
                id: 'poi_id',
                createdAt: date,
                updatedAt: date
            }))
            .digest('hex');
        const localData = {
            [hash]: {
                name: 'poi',
                price: 50,
                id: 'poi_id',
                createdAt: date,
                updatedAt: date
            }
        }
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {},
                    hashes: Object.keys(localData),
                    return: ['name', 'price']
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(4);
        // expect(results.queryProduct[2]).eql(hash);
    });
    it('should perform query based on id if with local hashes supplied', async function () {
        const data = {
            name: 'poi',
            price: 50,
            id: 'poi_id',
            createdAt: date,
            updatedAt: date
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
            options,
            null
        );
        should().exist(results.queryProduct);
        // expect(typeof results.queryProduct).eql('string');
        // expect(results.queryProduct).eql(hash);
    });
    it('should perform query when filter is in or format/array', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {
                        $or: [
                            {name: 'xyz'},
                            {name: 'poi'}
                        ]
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(2);
        // expect(results.queryProduct).eql([
        //     {
        //         name: 'xyz',
        //         price: 60,
        //         tags: {a: 1, b: {c: 2}},
        //         status: 'new',
        //         id: 'xyzid',
        //         createdAt: date,
        //         createdBy: null,
        //         updatedAt: date
        //     },
        //     {
        //         id: 'poi_id', createdBy: null,
        //         name: 'poi', price: 50, status: 'new', createdAt: date,
        //         updatedAt: date
        //     },
        // ]);
    });
    it('should perform query when filter is in or format/array and one query is false', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {
                        $or: [
                            {name: 'xyz'},
                            {name: 'joshua'}
                        ]
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(1);
        expect(results.queryProduct).eql([
            {
                name: 'xyz',
                tags: {a: 1, b: {c: 2}},
                price: 60,
                status: 'new',
                id: 'xyzid',
                createdAt: date,
                createdBy: null,
                updatedAt: date
            },
        ]);
    });
    it('should perform count query when filter is in or format/array', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {
                        $or: [
                            {name: 'xyz'},
                            {name: 'poi'}
                        ]
                    },
                    count: true,
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(results.queryProduct).eql(2);
    });
    it('should return empty when and operation not met', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {name: 'xyz', tag: 'joshua'},
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(0);
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
                        createdAt: date,
                        updatedAt: date
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(1);
        expect(results.queryProduct).eql([
            {
                name: 'xyz',
                price: 60,
                tags: {a: 1, b: {c: 2}},
                status: 'new',
                id: 'xyzid',
                createdAt: date,
                createdBy: null,
                updatedAt: date
            }
        ]);
    });
    it('should perform query with expression', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {
                        $or: [
                            {price: 50},
                            {price: 100}
                        ]
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(2);
    });
    it('should order the results by asc when perform query with expression and orderBy provided', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {
                        price: {
                            $exists: true,
                        }
                    },
                    orderBy: [{price: 1}],
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(3);
        expect(results.queryProduct).eql([
            {
                id: 'poi_id',
                name: 'poi',
                price: 50,
                status: 'new',
                createdAt: date,
                createdBy: null,
                updatedAt: date
            },
            {
                name: 'xyz',
                price: 60,
                tags: {a: 1, b: {c: 2}},
                status: 'new',
                id: 'xyzid',
                createdAt: date,
                createdBy: null,
                updatedAt: date
            },
            {
                id: 'wer_id',
                name: 'wer',
                price: 100,
                status: 'new',
                createdAt: date,
                createdBy: null,
                updatedAt: date
            },
        ]);
    });
    it('should order the results by asc when perform query with expression and orderBy provided and limit', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {
                        price: {
                            $exists: true,
                        }
                    },
                    size: 2,
                    orderBy: [{price: 1}],
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(2);
        expect(results.queryProduct).eql([
            {
                id: 'poi_id',
                name: 'poi',
                price: 50,
                status: 'new',
                createdAt: date,
                createdBy: null,
                updatedAt: date
            },
            {
                name: 'xyz',
                price: 60,
                tags: {a: 1, b: {c: 2}},
                status: 'new',
                id: 'xyzid',
                createdAt: date,
                createdBy: null,
                updatedAt: date
            }
        ]);
    });
    it('should order the results by asc when perform query with expression and orderBy provided and skip', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {
                        price: {
                            $exists: true
                        }
                    },
                    skip: 2,
                    orderBy: [{price: 1}],
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(1);
        expect(results.queryProduct).eql([
            {
                id: 'wer_id',
                name: 'wer',
                price: 100,
                status: 'new',
                createdAt: date,
                createdBy: null,
                updatedAt: date
            },
        ]);
    });
    it('should order the results by dsc when perform query with expression and orderBy provided', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {
                        price: {
                            $exists: true,
                        }
                    },
                    orderBy: [{price: -1}],
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(3);
        expect(results.queryProduct).eql([
            {
                id: 'wer_id',
                name: 'wer',
                price: 100,
                status: 'new',
                createdBy: null,
                createdAt: date,
                updatedAt: date
            },
            {
                name: 'xyz',
                price: 60,
                tags: {a: 1, b: {c: 2}},
                status: 'new',
                id: 'xyzid',
                createdAt: date,
                createdBy: null,
                updatedAt: date
            },
            {
                id: 'poi_id',
                name: 'poi',
                price: 50,
                status: 'new',
                createdAt: date,
                createdBy: null,
                updatedAt: date
            },
        ]);
    });
    it('should deep match', async function () {
        const results = await handleQueryRules({
                queryProduct: {
                    filter: {
                        'tags.b.c': 2
                    },
                    return: []
                }
            }, {errors: {}},
            options,
            null
        );
        should().exist(results.queryProduct);
        expect(Array.isArray(results.queryProduct)).eql(true);
        expect(results.queryProduct.length).eql(1);
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
                createdAt: date,
                createdBy: null,
                updatedAt: date
            }
        ]);
    });
    it('should not fetch old data in a node if that node updated from main data object', async function () {
        await handleCreateRules({
                createProduct: {
                    id: 'oldnode',
                    createdAt: date,
                    updatedAt: date,
                    bei: 5000
                },
            }, {errors: {}},
            options,
            null
        );
        await handleUpdateRules({updateProduct: {id: 'oldnode', update: {$set: {bei: 4000}}}},
            {errors: {}},
            options,
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
            options,
            null
        );
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
            options,
            null
        );
        should().exist(results1);
        should().exist(results1.queryProduct);
        expect(results1.queryProduct).length(1);
        expect(results1.queryProduct[0].id).eql('oldnode');
        expect(results1.queryProduct[0].bei).eql(4000);
    });
});