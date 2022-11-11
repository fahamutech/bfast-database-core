import {removePolicyRule} from "./remove";
import {databaseFactory} from "../../test";
import {expect} from "chai";
import {listPolicyRule} from "./list";
import {policyRuleContext} from "./index.spec";
import {loadEnv} from "../../utils";

let options;
describe('PolicyRemove', function () {
    // before(async () => await clearPolicy());
    // after(async () => await clearPolicy());
    beforeEach(() => options = loadEnv());
    describe('removePolicyRule', function () {
        it('should remove previous rule', async function () {
            const a = await removePolicyRule('create.test', policyRuleContext, databaseFactory(), options);
            expect(a).be.a('array');
            expect(a[0].id).eql('create.test');
            const c = await listPolicyRule(databaseFactory(),policyRuleContext, options);
            expect(c).length(2)
        });
        it('should not remove not exist rule', async function () {
            const a = await removePolicyRule('create.na', policyRuleContext, databaseFactory(), options);
            expect(a).be.a('array');
            expect(a).length(0)
        });
    });
});
