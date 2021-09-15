const {mongoRepSet} = require('../../mock.config');
const {before, after} = require('mocha');
const {assert} = require('chai');
const {RulesController} = require("../../../dist");

describe('RulesController::Utilities Unit Test', function () {

    let _rulesController = new RulesController();
    let mongoMemoryReplSet
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        await mongoMemoryReplSet.start();
    });
    after(async function () {
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
