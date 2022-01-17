import {expect, should} from "chai";
import {handleCreateRules, handleDeleteRules} from "./rules";
import {loadEnv} from "../utils/env";
import {databaseFactory} from "../test";
import {extractResultFromServer} from "bfast";

let options;

async function clearData() {
    const a = await handleDeleteRules({
        deleteTest: {
            filter: {
                updatedAt: {$exists: true}
            }
        }
    }, {errors: {}}, databaseFactory(), loadEnv(), null)
    extractResultFromServer(a, 'delete', 'Test')
}

describe('RulesController', function () {
    beforeEach(async () => options = loadEnv())
    before(async () => await clearData());
    after(async () => await clearData());
    describe('RulesCreateController', function () {
        it('should save single document', async function () {
            const date = new Date().toISOString();
            const rule = {
                createTest: {
                    name: 'doe',
                    age: 20,
                    createdAt: date,
                    updatedAt: date,
                    return: []
                }
            }
            const results =
                await handleCreateRules(rule, {errors: {}}, databaseFactory(), options, null);
            should().exist(results.createTest);
            expect(typeof results.createTest).equal('object');
            expect(typeof results.createTest['id']).equal('string');
            expect(results.createTest['name']).equals('doe');
            expect(results.createTest['age']).equal(20);
            expect(results.createTest['createdAt']).eql(new Date(date));
            expect(results.createTest['updatedAt']).eql(new Date(date));
        });
        it('should save single document with custom id', async function () {
            const rule = {
                createTest: {
                    id: 'doedoedoe',
                    name: 'doe',
                    age: 20,
                    return: []
                }
            }
            const results =
                await handleCreateRules(rule, {errors: {}}, databaseFactory(), options, null);
            should().exist(results.createTest);
            expect(typeof results.createTest).equal('object');
            expect(typeof results.createTest['id']).equal('string');
            expect(results.createTest['id']).equal('doedoedoe');
            expect(results.createTest['name']).equal('doe');
            expect(results.createTest['age']).equal(20);
        });
        it('should save many document', async function () {
            const rule = {
                createTest: [
                    {
                        name: 'doe2',
                        age: 20,
                        return: []
                    },
                    {
                        name: 'joshua',
                        age: 30,
                    },
                ]
            }
            const results =
                await handleCreateRules(rule, {errors: {}}, databaseFactory(), options, null);
            should().exist(results.createTest);
            expect(Array.isArray(results.createTest)).equal(true);
            expect(results.createTest.length).equal(2);
            expect(typeof results.createTest[0]['id']).equal('string');
            expect(results.createTest[0]['name']).equal('doe2');
            expect(results.createTest[0]['age']).equal(20);
            expect(typeof results.createTest[1]['id']).equal("string");
        });
        it('should save document and return only specified fields', async function () {
            const rule = {
                createTest: {
                    name: 'john',
                    age: 20,
                    home: 'mars',
                    car: 'monster',
                    return: ['name', 'home']
                }
            }
            const results =
                await handleCreateRules(rule, {errors: {}}, databaseFactory(), options, null);
            should().exist(results.createTest);
            expect(typeof results.createTest['id']).equal('string');
            expect(results.createTest['name']).equal('john');
            expect(typeof results.createTest['age']).equal("undefined");
            expect(results.createTest['home']).equal("mars");
        });
        // it('should return same document if saved multiple times', async function () {
        //     await handleCreateRules({
        //             createTest: {
        //                 id: 'doe',
        //                 name: 'doe',
        //                 age: 20,
        //                 home: 'mars',
        //                 car: 'monster',
        //             }
        //         }, {errors: {}},
        //         config
        //     );
        //     const results = await handleCreateRules({
        //             createTest: {
        //                 id: 'doe',
        //                 name: 'doe',
        //                 age: 20,
        //                 home: 'mars',
        //                 car: 'monster',
        //                 return: []
        //             }
        //         }, {errors: {}},
        //         config
        //     );
        //     const _results = await handleQueryRules({
        //             queryTest: {
        //                 filter: {
        //                     id: 'doe'
        //                 },
        //                 count: true
        //             }
        //         }, {errors: {}},
        //         config
        //     );
        //     // console.log(results);
        //     should().exist(results.createTest);
        //     expect(results.createTest.id).equal('doe');
        //     expect(results.createTest.name).equal('doe');
        //     expect(_results.queryTest).equal(1);
        // });
    });
});