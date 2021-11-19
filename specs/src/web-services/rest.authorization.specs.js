const {config, mongoRepSet, sendRuleRequest} = require('../../mock.config.mjs');
const {should, expect} = require('chai');

describe('Policy', function () {
    let mongoMemoryReplSet
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        await mongoMemoryReplSet.start();
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });

    describe('add', function () {
        it('should add a permission policy to a resource url', async function () {
            const authorization = {
                applicationId: config.applicationId,
                masterKey: config.masterKey,
                policy: {
                    add: {
                        "create.Product": `const uid = context.uid;return auth === true;`,
                    }
                }
            };
            const data = await sendRuleRequest(authorization);
            should().exist(data);
            expect(typeof data).equal("object");
            expect(typeof data['policy']).equal("object");
            should().exist(data['policy'].add);
            expect(typeof data['policy'].add).equal("object");
            expect(typeof data['policy'].add['create.Product']).equal("object");
            expect(data['policy'].add['create.Product'].ruleId).equal("create.Product");
            expect(data['policy'].add['create.Product'].ruleBody).equal("const uid = context.uid;return auth === true;");
            should().exist(data['policy'].add['create.Product'].createdAt);
            should().exist(data['policy'].add['create.Product'].updatedAt);
            expect(data['policy'].add['create.Product'].id).equal('create.Product');
        });
    });

    describe('list', function () {
        it('should return saved policies', async function () {
            const authorization = {
                applicationId: config.applicationId,
                masterKey: config.masterKey,
                policy: {
                    list: {}
                }
            };
            const data = await sendRuleRequest(authorization);
            should().exist(data);
            expect(typeof data).equal("object");
            expect(typeof data['policy']).equal("object");
            expect(Array.isArray(data.policy.list)).equal(true);
            expect(data.policy.list).length(1);
            expect(data.policy.list[0].id).equal('create.Product');
        });
    });

    describe('remove', function () {
        it('should remove saved policy', async function () {
            const authorization = {
                applicationId: config.applicationId,
                masterKey: config.masterKey,
                policy: {
                    remove: {
                        ruleId: 'create.Product'
                    }
                }
            };
            const data = await sendRuleRequest(authorization);
            should().exist(data);
            expect(typeof data).equal("object");
            expect(typeof data['policy']).equal("object");
            should().exist(data.policy.remove);
            expect(Array.isArray(data.policy.remove)).equal(true);
            expect(data.policy.remove).length(1);
            expect(data.policy.remove[0].id).equal('create.Product');
        });
    });

});
