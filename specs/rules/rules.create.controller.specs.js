const {getRulesController, mongoRepSet} = require('../mock.config');
const {should, expect, assert} = require("chai");
const exp = require("constants");

describe('RulesController', function () {
    this.timeout(10000000000000000);
    let _rulesController;
    let mongoMemoryReplSet
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        _rulesController = await getRulesController(mongoMemoryReplSet);
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });

    describe('Create::Anonymous', function () {
        it('should save single document', async function () {
            const results = await _rulesController.handleCreateRules({
                createTest: {
                    name: 'doe',
                    age: 20,
                    return: []
                }
            }, {errors: {}});
            should().exist(results.createTest);
            expect(typeof results.createTest).equal('object');
            expect(typeof results.createTest['id']).equal('string');
            expect(results.createTest['name']).equals('doe');
            expect(results.createTest['age']).equal(20);
        });
        it('should save single document with custom id', async function () {
            const results = await _rulesController.handleCreateRules({
                createTest: {
                    id: 'doedoedoe',
                    name: 'doe',
                    age: 20,
                    return: []
                }
            }, {errors: {}});
            should().exist(results.createTest);
            expect(typeof results.createTest).equal('object');
            expect(typeof results.createTest['id']).equal('string');
            expect(results.createTest['id']).equal('doedoedoe');
            expect(results.createTest['name']).equal('doe');
            expect(results.createTest['age']).equal(20);
        });
        it('should save many document', async function () {
            const results = await _rulesController.handleCreateRules({
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
            }, {errors: {}});
            should().exist(results.createTest);
            expect(Array.isArray(results.createTest)).equal(true);
            expect(results.createTest.length).equal(2);
            expect(typeof results.createTest[0]['id']).equal('string');
            expect(results.createTest[0]['name']).equal('doe2');
            expect(results.createTest[0]['age']).equal(20);
            expect(typeof results.createTest[1]['id']).equal("string");
        });
        it('should save document and return only specified fields', async function () {
            const results = await _rulesController.handleCreateRules({
                createTest: {
                    name: 'john',
                    age: 20,
                    home: 'mars',
                    car: 'monster',
                    return: ['name', 'home']
                }
            }, {errors: {}});
            should().exist(results.createTest);
            expect(typeof results.createTest['id']).equal('string');
            expect(results.createTest['name']).equal('john');
            expect(typeof results.createTest['age']).equal("undefined");
            expect(results.createTest['home']).equal("mars");
        });
        it('should return same document if saved multiple times', async function () {
            await _rulesController.handleCreateRules({
                createTest: {
                    id: 'doe',
                    name: 'doe',
                    age: 20,
                    home: 'mars',
                    car: 'monster',
                }
            }, {errors: {}});
            const results = await _rulesController.handleCreateRules({
                createTest: {
                    id: 'doe',
                    name: 'doe',
                    age: 20,
                    home: 'mars',
                    car: 'monster',
                    return: []
                }
            }, {errors: {}});
            const _results = await _rulesController.handleQueryRules({
                queryTest: {
                    filter: {
                        _id: 'doe'
                    },
                    count: true
                }
            }, {errors: {}});
            should().exist(results.createTest);
            expect(results.createTest.id).equal('doe');
            expect(results.createTest.name).equal('doe');
            expect(_results.queryTest).equal(1);
        });
    });

    describe('Create::Secured', function () {
        before(async function () {
            await _rulesController.handleAuthorizationRule({
                context: {
                    useMasterKey: true
                },
                policy: {
                    add: {
                        "create.*": "return false;",
                        "create.Name": "return context.auth===true;",
                    }
                }
            }, {errors: {}});
        });
        after(async function () {
            await _rulesController.handleAuthorizationRule({
                context: {
                    useMasterKey: true
                },
                policy: {
                    remove: {
                        ruleId: "create.*",
                    }
                }
            }, {errors: {}});
            await _rulesController.handleAuthorizationRule({
                context: {
                    useMasterKey: true
                },
                policy: {
                    remove: {
                        ruleId: "create.names",
                    }
                }
            }, {errors: {}});
        });

        it('should return error message when write to protect domain', async function () {
            const results = await _rulesController.handleCreateRules({
                createProduct: {
                    name: 'xyz',
                    price: 40,
                    return: []
                }
            }, {errors: {}});
            should().exist(results.errors);
            should().exist(results.errors['create.Product']);
            expect(results.errors['create.Product']['message']).equal('You have insufficient permission to this resource');
            expect(typeof results.errors['create.Product']['data']).equal("object");
        });
        it('should return saved data when have access to domain domain', async function () {
            const results = await _rulesController.handleCreateRules({
                context: {
                    auth: true
                },
                createName: {
                    name: 'xyz',
                    age: 40,
                    return: []
                }
            }, {errors: {}});
            should().exist(results.createName);
            expect(typeof results.createName).equal('object');
            expect(typeof results.createName['id']).equal('string');
            expect(results.createName['name']).equal('xyz');
            expect(results.createName['age']).equal(40);
        });
    });
});
