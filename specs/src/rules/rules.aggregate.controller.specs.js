// const {getRulesController, mongoRepSet} = require('../mock.config');
// const {before, after} = require('mocha');
// const {assert, expect, should} = require('chai');
// const {createHash} = require('crypto');
//
// describe('RulesController::Aggregation Unit Test', function () {
//     this.timeout(10000000000000000);
//     let _rulesController;
//     let mongoMemoryReplSet
//     before(async function () {
//         mongoMemoryReplSet = mongoRepSet();
//         _rulesController = await getRulesController(mongoMemoryReplSet);
//         await _rulesController.handleCreateRules({
//             createProduct: {
//                 name: 'xyz',
//                 age: 89,
//                 id: 'xyz_id',
//                 createdAt: 'test',
//                 updatedAt: 'test'
//             }
//         }, {errors: {}});
//     });
//     after(async function () {
//         await mongoMemoryReplSet.stop();
//     });
//     it('should perform aggregation for a specified domain', async function () {
//         const results = await _rulesController.handleAggregationRules({
//             context: {},
//             aggregateProduct: [
//                 {
//                     $match: {
//                         name: 'xyz'
//                     }
//                 }
//             ]
//         }, {errors: {}});
//         should().exist(results.aggregateProduct);
//         expect(Array.isArray(results.aggregateProduct)).equal(true);
//         expect(results.aggregateProduct).length(1);
//         expect(results.aggregateProduct[0].name).equal('xyz');
//         expect(results.aggregateProduct[0].age).equal(89);
//         expect(typeof results.aggregateProduct[0].id).equal('string');
//     });
//     it('should perform aggregation for a specified domain with company group id', async function () {
//         const results = await _rulesController.handleAggregationRules({
//             context: {
//                 useMasterKey: false
//             },
//             aggregateProduct: [
//                 {
//                     $match: {
//                         name: 'xyz'
//                     }
//                 },
//                 {
//                     $group: {
//                         _id: {
//                             name: '$name'
//                         },
//                         name: {$first: '$name'},
//                         age: {$first: '$age'},
//                     }
//                 }
//             ]
//         }, {errors: {}});
//         assert(results.aggregateProduct !== undefined);
//         assert(Array.isArray(results.aggregateProduct));
//         assert(results.aggregateProduct.length === 1);
//         assert(results.aggregateProduct[0].name === 'xyz');
//         assert(results.aggregateProduct[0].age === 89);
//         assert(typeof results.aggregateProduct[0].id === 'object');
//     });
//     it('should perform aggregation for a specified domain with local data hashes supplied', async function () {
//         const data = {
//             name: 'xyz',
//             age: 89,
//             id: 'xyz_id',
//             createdAt: 'test',
//             updatedAt: 'test',
//             createdBy: null
//         };
//         const hash = createHash('sha256')
//             .update(JSON.stringify(data))
//             .digest('hex');
//         const localData = {
//             [hash]: data
//         }
//         const results = await _rulesController.handleAggregationRules({
//             context: {
//                 useMasterKey: false
//             },
//             aggregateProduct: {
//                 hashes: Object.keys(localData),
//                 pipelines: [
//                     {
//                         $match: {
//                             name: 'xyz'
//                         }
//                     }
//                 ]
//             }
//         }, {errors: {}});
//         assert(results.aggregateProduct !== undefined);
//         assert(Array.isArray(results.aggregateProduct));
//         assert(results.aggregateProduct.length === 1);
//         assert(results.aggregateProduct[0] === hash);
//         // assert(results.aggregateProduct[0].age === 89);
//         assert(typeof results.aggregateProduct[0] === 'string');
//     });
//     it('should perform aggregation for a specified domain with more than match pipe with local data hashes supplied', async function () {
//         const data = {name: 'xyz', age: 89, id: 'xyz'};
//         const hash = createHash('sha256')
//             .update(JSON.stringify(data))
//             .digest('hex');
//         const localData = {
//             [hash]: data
//         }
//         const results = await _rulesController.handleAggregationRules({
//             context: {
//                 useMasterKey: false
//             },
//             aggregateProduct: {
//                 hashes: Object.keys(localData),
//                 pipelines: [
//                     {
//                         $match: {
//                             name: 'xyz'
//                         }
//                     },
//                     {
//                         $group: {
//                             _id: "$name",
//                             name: {$first: '$name'},
//                             age: {$first: '$age'},
//                         }
//                     }
//                 ]
//             }
//         }, {errors: {}});
//         assert(results.aggregateProduct !== undefined);
//         assert(Array.isArray(results.aggregateProduct));
//         assert(results.aggregateProduct.length === 1);
//         assert(results.aggregateProduct[0] === hash);
//         assert(typeof results.aggregateProduct[0] === 'string');
//     });
// });
