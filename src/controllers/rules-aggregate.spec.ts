import {after, before} from "mocha";
import {expect, should} from "chai";
import {handleAggregationRules, handleCreateRules, handleDeleteRules} from "./rules";
import {loadEnv} from "../utils/env";
import {extractResultFromServer} from "bfast";
import {databaseFactory} from "../test";

let options;
const date = new Date()

async function createData() {
    const rule = {
        createProduct: {
            name: 'xyz',
            age: 89,
            id: 'xyz_id',
            createdAt: date,
            updatedAt: date
        }
    }
    const r = await handleCreateRules(rule, {errors: {}}, databaseFactory(), loadEnv(), null);
    extractResultFromServer(r, 'create', 'Product')
}

async function clearData() {
    const a = await handleDeleteRules({
        deleteProduct: {filter: {updatedAt: {$exists: true}}}
    }, {errors: {}}, databaseFactory(), loadEnv(), null)
    extractResultFromServer(a, 'delete', 'Product')
}

describe('RulesAggregateController', function () {
    beforeEach(() => options = loadEnv())
    before(async () => {
        await clearData()
        await createData()
    });
    after(async () => await clearData());
    describe('handleAggregateRule', function () {
        it('should perform aggregation for a specified domain', async function () {
            const results = await handleAggregationRules(
                {
                    context: {
                        useMasterKey: false
                    },
                    aggregateProduct: [
                        {
                            $match: {
                                name: 'xyz'
                            }
                        }
                    ]
                },
                {errors: {}}, databaseFactory(),options
            );
            should().exist(results.aggregateProduct);
            expect(results.aggregateProduct).be.a('array');
            expect(results.aggregateProduct).length(1);
            expect(results.aggregateProduct[0].name).equal('xyz');
            expect(results.aggregateProduct[0].age).equal(89);
            expect(results.aggregateProduct[0].id).be.a('string');
        });
        it('should perform aggregation for a specified domain with company group id', async function () {
            const results = await handleAggregationRules({
                context: {
                    useMasterKey: false
                },
                aggregateProduct: [
                    {
                        $match: {
                            name: 'xyz'
                        }
                    },
                    {
                        $group: {
                            _id: {
                                name: '$name'
                            },
                            name: {$first: '$name'},
                            age: {$first: '$age'},
                        }
                    }
                ]
            }, {errors: {}},databaseFactory(), options);
            should().exist(results.aggregateProduct);
            expect(results.aggregateProduct).be.a('array');
            expect(results.aggregateProduct).length(1);
            expect(results.aggregateProduct[0].name).equal('xyz');
            expect(results.aggregateProduct[0].age).equal(89);
            expect(results.aggregateProduct[0].id).be.a('object');
        });
    });
});