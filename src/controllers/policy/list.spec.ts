import {databaseFactory} from "../../test";
import {expect} from "chai";
import {clearPolicy, policyRuleContext} from "./index.spec";
import {listPolicyRule} from "./list";
import {loadEnv} from "../../utils";

let options;

describe('PolicyList', function () {
    before(async () => await clearPolicy());
    after(async () => await clearPolicy());
    beforeEach(() => options = loadEnv());
    describe('listPolicyRule', function () {
        it('should list all policy', async function () {
            const policies = await listPolicyRule(databaseFactory(),policyRuleContext, options)
            expect(policies).be.a('array');
            expect(policies[0]).be.a('object');
            delete policies[0].createdAt
            delete policies[0].updatedAt
            delete policies[0].createdBy
            expect(policies).eql([{
                ruleId: 'create.test',
                ruleBody: 'return true;',
                id: 'create.test'
            }]);
        });
    });
});
