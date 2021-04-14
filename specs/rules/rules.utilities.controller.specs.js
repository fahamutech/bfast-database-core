const {getRulesController, mongoRepSet} = require('../mock.config');
const {before, after} = require('mocha');
const assert = require('assert');

describe('RulesController::Utilities Unit Test', function () {
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

    it('should return array of rule block fields', function () {
        const rules = _rulesController.getRulesKey({
            applicationId: 'daas',
            CreateTest: {},
            UpdateTest: {}
        });
        assert(Array.isArray(rules));
        assert(rules.length === 3);
        assert(rules.includes('applicationId'));
        assert(rules.includes('CreateTest'));
        assert(rules.includes('UpdateTest'));
    });

    it('should return an empty array', function () {
        const rules = _rulesController.getRulesKey(null);
        assert(Array.isArray(rules));
        assert(rules.length === 0);
    });

    it('should return a domain from rule', function () {
        const domain = _rulesController.extractDomain('createTest', "create");
        assert(domain === 'Test');
    });

    it('should return null from rule when remove is unknown', function () {
        const domain = _rulesController.extractDomain('CreateTest', "john");
        assert(domain === null);
    });

    it('should return null from rule when rule is unknown', function () {
        const domain = _rulesController.extractDomain('johnTest', "Create");
        assert(domain === null);
    });

    it('should return null from rule when rule and remove is unknown', function () {
        const domain = _rulesController.extractDomain('johnTest', "john");
        assert(domain === null);
    });
});
