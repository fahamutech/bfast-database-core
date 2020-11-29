const {getRulesController, mongoRepSet} = require('../../mock.config');
const {before, after} = require('mocha');
const assert = require('assert');

describe('RulesController::Create Unit Test', function () {
    let _rulesController;
    let mongoMemoryReplSet
    before(async function () {
        this.timeout(10000000000000000);
        mongoMemoryReplSet = mongoRepSet();
        _rulesController = await getRulesController(mongoMemoryReplSet);
    });
    after(async function () {
        this.timeout(10000000000000000);
        await mongoMemoryReplSet.stop();
    });

    describe('RulesController::Create::Anonymous', function () {
        it('should save single document', async function () {
            const results = await _rulesController.handleCreateRules({
                createTest: {
                    name: 'doe',
                    age: 20,
                    return: []
                }
            }, {errors: {}});
            assert(results.createTest !== undefined);
            assert(typeof results.createTest === 'object');
            assert(typeof results.createTest['id'] === 'string');
            assert(results.createTest['name'] === 'doe');
            assert(results.createTest['age'] === 20);
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
            assert(results.createTest !== undefined);
            assert(typeof results.createTest === 'object');
            assert(typeof results.createTest['id'] === 'string');
            assert(results.createTest['id'] === 'doedoedoe');
            assert(results.createTest['name'] === 'doe');
            assert(results.createTest['age'] === 20);
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
            assert(results.createTest !== undefined);
            assert(Array.isArray(results.createTest));
            assert(results.createTest.length === 2);
            assert(typeof results.createTest[0]['id'] === 'string');
            assert(results.createTest[0]['name'] === 'doe2');
            assert(results.createTest[0]['age'] === 20);
            assert(typeof results.createTest[1]['id'] === "string");
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
            assert(results.createTest !== undefined);
            assert(typeof results.createTest['id'] === 'string');
            assert(results.createTest['name'] === 'john');
            assert(typeof results.createTest['age'] === "undefined");
            assert(results.createTest['home'] === "mars");
        });
    });

    describe('RulesController::Create::Secured', function () {
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
            assert(results.errors !== undefined);
            assert(results.errors['create.Product'] !== undefined);
            assert(results.errors['create.Product']['message'] === 'You have insufficient permission to this resource');
            assert(typeof results.errors['create.Product']['data'] === "object");
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
            assert(results.createName !== undefined);
            assert(typeof results.createName === 'object');
            assert(typeof results.createName['id'] === 'string');
            assert(results.createName['name'] === 'xyz');
            assert(results.createName['age'] === 40);
        });
    });
});
