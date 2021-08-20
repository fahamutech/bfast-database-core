const {getRulesController, mongoRepSet} = require('../../mock.config');
const {createHash} = require('crypto');
const {expect, should, assert} = require('chai');

describe('RulesController', function () {

    let _rulesController;
    let mongoMemoryReplSet;
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        _rulesController = await getRulesController(mongoMemoryReplSet);
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });
    describe('Query::Anonymous', function () {
        before(async function () {
            await _rulesController.handleCreateRules({
                createProduct: [
                    {name: 'xyz', price: 50, status: 'new', id: 'xyzid', createdAt: 'test', updatedAt: 'test'},
                    {id: 'wer_id', name: 'wer', price: 100, status: 'new', createdAt: 'test', updatedAt: 'test'},
                    {id: 'poi_id', name: 'poi', price: 50, status: 'new', createdAt: 'test', updatedAt: 'test'},
                ]
            }, {errors: {}});
        });
        it('should return query result based on id', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    id: 'xyzid',
                    return: []
                }
            }, {errors: {}});
            assert(results.queryProduct !== undefined);
            assert(results.queryProduct.name === 'xyz');
            assert(results.queryProduct.id === 'xyzid');
            assert(results.queryProduct.price === 50);
            assert(results.queryProduct.status === 'new');
        });
        it('should return null when id supplied is not exist', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    id: 'xyz1234hint',
                    return: []
                }
            }, {errors: {}});
            assert(results.queryProduct === null);
        });
        it('should return query result based on filter', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {
                        name: 'xyz'
                    },
                    return: []
                }
            }, {errors: {}});
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            should().exist(results.queryProduct[0]);
            expect(results.queryProduct[0].name).equal('xyz');
            expect(results.queryProduct[0].id).equal('xyzid');
            expect(results.queryProduct[0].price).equal(50);
            expect(results.queryProduct[0].status).equal('new');
        });
        it('should limit size of the results', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {},
                    size: 1,
                    skip: 0,
                    return: []
                }
            }, {errors: {}});
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct).length(1);
        });
        it('should limit size of the results when filter applied', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {
                        name: function (n) {
                            return n.toString().length > 0
                        }
                    },
                    size: 2,
                    skip: 0,
                    return: []
                }
            }, {errors: {}});
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct).length(2);
        });
        it('should perform basic query based on empty filter', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {},
                    return: ['name', 'price']
                }
            }, {errors: {}});
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(3);
            expect(results.queryProduct).eql([
                {name: 'xyz', price: 50, id: 'xyzid', createdAt: 'test', updatedAt: 'test'},
                {id: 'wer_id', name: 'wer', price: 100, createdAt: 'test', updatedAt: 'test'},
                {id: 'poi_id', name: 'poi', price: 50, createdAt: 'test', updatedAt: 'test'},
            ])
        });
        it('should perform basic query based on empty filter with orderBy', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {},
                    orderBy: [{'name': 1}],
                    return: ["name"]
                }
            }, {errors: {}});
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(3);
        });
        it('should count object based on filter', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {
                        name: 'xyz'
                    },
                    count: true,
                }
            }, {errors: {}});
            assert(results.queryProduct !== undefined);
            assert(typeof results.queryProduct === "number");
            assert(results.queryProduct === 1);
        });
        it('should count object based on empty filter', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {},
                    count: true,
                }
            }, {errors: {}});
            assert(results.queryProduct !== undefined);
            assert(typeof results.queryProduct === "number");
            assert(results.queryProduct === 3);
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
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {},
                    hashes: Object.keys(localData),
                    return: ['name', 'price']
                }
            }, {errors: {}});
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(3);
            expect(results.queryProduct[2]).equal(hash);
        });
        it('should perform query based on id f with local hashes supplied', async function () {
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
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    id: 'poi_id',
                    filter: {},
                    hashes: Object.keys(localData),
                    return: ['name', 'price']
                }
            }, {errors: {}});
            should().exist(results.queryProduct);
            expect(typeof results.queryProduct).equal('string');
            expect(results.queryProduct).equal(hash);
        });
        it('should perform query when filter is in or format/array', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: [
                        {name: 'xyz'},
                        {name: 'poi'}
                    ],
                    return: []
                }
            }, {errors: {}});
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(2);
            expect(results.queryProduct).eql([
                {name: 'xyz', price: 50, status: 'new', id: 'xyzid', createdAt: 'test', updatedAt: 'test'},
                {id: 'poi_id', name: 'poi', price: 50, status: 'new', createdAt: 'test', updatedAt: 'test'},
            ]);
        });
        it('should perform query when filter is in or format/array and one query is false', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: [
                        {name: 'xyz'},
                        {name: 'joshua'}
                    ],
                    return: []
                }
            }, {errors: {}});
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(1);
            expect(results.queryProduct).eql([
                {name: 'xyz', price: 50, status: 'new', id: 'xyzid', createdAt: 'test', updatedAt: 'test'},
            ]);
        });
        it('should perform count query when filter is in or format/array', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: [
                        {name: 'xyz'},
                        {name: 'poi'}
                    ],
                    count: true,
                    return: []
                }
            }, {errors: {}});
            should().exist(results.queryProduct);
            expect(results.queryProduct).equal(2);
        });
        it('should return empty when and operation not met', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {name: 'xyz', tag: 'joshua'},
                    return: []
                }
            }, {errors: {}});
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(0);
        });
        it('should return docs when full doc supplied in query', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {
                        name: 'xyz',
                        price: 50,
                        status: 'new',
                        id: 'xyzid',
                        createdAt: 'test',
                        updatedAt: 'test'
                    },
                    return: []
                }
            }, {errors: {}});
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(1);
            expect(results.queryProduct).eql([
                {name: 'xyz', price: 50, status: 'new', id: 'xyzid', createdAt: 'test', updatedAt: 'test'}
            ]);
        });
        it('should perform query with expression', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {
                        price: function (p) {
                            return (p === 50 || p === 100);
                        },
                        // name: 'xyz'
                    },
                    return: []
                }
            }, {errors: {}});
            // console.log(results.queryProduct);
            // expect(results.queryProduct).to.have.members([
            //     {id: 'wer_id', name: 'wer', price: 100, status: 'new', createdAt: 'test', updatedAt: 'test'},
            //     {name: 'xyz', price: 50, status: 'new', id: 'xyzid', createdAt: 'test', updatedAt: 'test'},
            //     {id: 'poi_id', name: 'poi', price: 50, status: 'new', createdAt: 'test', updatedAt: 'test'},
            // ]);
            should().exist(results.queryProduct);
            expect(Array.isArray(results.queryProduct)).equal(true);
            expect(results.queryProduct.length).equal(3);
        });
    });
});
