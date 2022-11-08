import {databaseFactory} from "../../test";
import {loadEnv} from "../../utils";
import {expect} from "chai";
import {addPolicyRule} from "./add";
import {clearPolicy, policyRuleContext} from "./index.spec";

describe('PolicyAddController', function () {
    before(async () => await clearPolicy());
    after(async () => await clearPolicy());
    describe('addPolicyRule', function () {
        it('should add a policy', async function () {
            const policy: any =
                await addPolicyRule("create.test", "return false;",
                    databaseFactory(), policyRuleContext, loadEnv());
            expect(policy).eql({
                id: "create.test",
                ruleId: "create.test",
                ruleBody: "return false;"
            });
        });
        it('should update if already exist', async function () {
            const policy: any =
                await addPolicyRule("create.test", "return true;",
                    databaseFactory(), policyRuleContext, loadEnv());
            expect(policy).eql({
                id: "create.test",
                ruleId: "create.test",
                ruleBody: "return true;"
            });
        });
    });
});
