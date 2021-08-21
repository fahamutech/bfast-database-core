const {config, mongoRepSet, sendRuleRequest, getRulesController} = require('../../mock.config');
const {should, expect} = require('chai');

describe('Database', function () {
    let mongoMemoryReplSet
    before(async function () {
        mongoMemoryReplSet = mongoRepSet();
        await mongoMemoryReplSet.start();
        const crate = {
            applicationId: config.applicationId,
            createT: [
                {
                    name: 'xps',
                    price: 10
                },
                {
                    name: 'hp',
                    price: 20
                }
            ]
        };
        await sendRuleRequest(crate);
    });
    after(async function () {
        await mongoMemoryReplSet.stop();
    });

    describe('query', function () {
        it('should perform query with expression', async function () {
            const query = {
                applicationId: config.applicationId,
                queryT: {
                    filter: {
                        name: {
                            $fn: `return it !== 'xps';`
                        }
                    },
                    return: []
                }
            };
            const data = await sendRuleRequest(query);
            should().exist(data);
            should().exist(data.queryT);
            expect(data.queryT).length(1);
            expect(data.queryT[0].name).equal('hp');
        });
    });

});