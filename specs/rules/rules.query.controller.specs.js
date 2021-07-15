const { getRulesController, mongoRepSet, daas } = require('../mock.config');
const { before, after } = require('mocha');
const assert = require('assert');
const { createHash } = require('crypto');

describe('RulesController::Query Unit Test', function () {
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
    describe('RulesController::Query::Anonymous', function () {
        before(async function () {
            await _rulesController.handleCreateRules({
                createProduct: [
                    { name: 'xyz', price: 50, status: 'new', id: 'xyz' },
                    { id: 'wer_id', name: 'wer', price: 100, status: 'new', createdAt: 'test', updatedAt: 'test' },
                    { id: 'poi_id', name: 'poi', price: 30, status: 'new', createdAt: 'test', updatedAt: 'test' },
                ]
            }, { errors: {} });
        });
        it('should return query result based on id', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    id: 'xyz',
                    return: []
                }
            }, { errors: {} });
            assert(results.queryProduct !== undefined);
            assert(results.queryProduct.name === 'xyz');
            assert(results.queryProduct.id === 'xyz');
            assert(results.queryProduct.price === 50);
            assert(results.queryProduct.status === 'new');
        });
        it('should return null when id supplied is not exist', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    id: 'xyz1234hint',
                    return: []
                }
            }, { errors: {} });
            console.log(results);
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
            }, { errors: {} });
            assert(results.queryProduct !== undefined);
            assert(Array.isArray(results.queryProduct));
            assert(results.queryProduct[0].name === 'xyz');
            assert(results.queryProduct[0].id === 'xyz');
            assert(results.queryProduct[0].price === 50);
            assert(results.queryProduct[0].status === 'new');
        });
        it('should perform basic query based on empty filter', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {},
                    return: ['name', 'price']
                }
            }, { errors: {} });
            assert(results.queryProduct !== undefined);
            assert(Array.isArray(results.queryProduct));
            assert(results.queryProduct.length === 3);
        });
        it('should perform basic query based on empty filter with orderBy', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {},
                    orderBy: [{ 'name': 1 }],
                    return: ["name"]
                }
            }, { errors: {} });
            assert(results.queryProduct !== undefined);
            assert(Array.isArray(results.queryProduct));
            assert(results.queryProduct.length === 3);
            assert(results.queryProduct[0].name === 'poi');
            assert(results.queryProduct[1].name === 'wer');
            assert(results.queryProduct[2].name === 'xyz');
        });
        it('should count object based on filter', async function () {
            const results = await _rulesController.handleQueryRules({
                queryProduct: {
                    filter: {
                        name: 'xyz'
                    },
                    count: true,
                }
            }, { errors: {} });
            assert(results.queryProduct !== undefined);
            assert(typeof results.queryProduct === "number");
            assert(results.queryProduct === 1);
        });
        it('should perform basic query based on empty filter with local hashes supplied', async function () {
            const hash = createHash('sha256')
                .update(JSON.stringify({
                    name: 'poi',
                    price: 30,
                    id: 'poi_id',
                    createdAt: 'test',
                    updatedAt: 'test'
                }))
                .digest('hex');
            const localData = {
                [hash]: {
                    name: 'poi',
                    price: 30,
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
            }, { errors: {} });
            // console.log(results);
            // console.log(results.queryProduct.map(x => {
            //     if (localData[x]) {
            //         return localData[x];
            //     } else {
            //         return x;
            //     }
            // }));
            assert(results.queryProduct !== undefined);
            assert(Array.isArray(results.queryProduct));
            assert(results.queryProduct.length === 3);
            assert(results.queryProduct[2] === hash);
        });
        it('should perform query based on id f with local hashes supplied', async function () {
            const data = {
                name: 'poi',
                price: 30,
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
            }, { errors: {} });
            // console.log(results);
            //     if (localData[results.queryProduct]) {
            //         console.log(localData[results.queryProduct]);
            //     }
            assert(results.queryProduct !== undefined);
            assert(typeof results.queryProduct === 'string');
            assert(results.queryProduct === hash);
        });
    });
});
