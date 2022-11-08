import {ruleHasPermission} from "./index";
import {expect} from "chai";
import {RuleContext} from "../../models/rule-context";
import {loadEnv} from "../../utils";
import {handleDeleteRules} from "../rules/rules";
import {extractResultFromServer} from "bfast";
import {databaseFactory} from "../../test";
import {addPolicyRule} from "./add";

export const policyRuleContext: RuleContext = {
    applicationId: 'bfast',
    useMasterKey: true
}
let options;

export async function clearPolicy() {
    policyRuleContext.useMasterKey = true
    const a = await handleDeleteRules({
        context: policyRuleContext,
        delete_Policy: {
            filter: {
                updatedAt: {$exists: true}
            }
        }
    }, {errors: {}}, databaseFactory(), loadEnv(), null)
    extractResultFromServer(a, 'delete', '_Policy')
}

describe('PolicyController', function () {
    before(async () => await clearPolicy());
    after(async () => await clearPolicy());
    beforeEach(() => options = loadEnv());
    describe('ruleHasPermission', function () {
        before(async () => {
            options = loadEnv()
            await addPolicyRule('create.mini', 'return false;', databaseFactory(), policyRuleContext, options)
            await addPolicyRule('update.*', 'return false;', databaseFactory(), policyRuleContext, options)
            policyRuleContext.useMasterKey = false
        })
        after(() => policyRuleContext.useMasterKey = true)
        it('should return true if action permitted', async function () {
            const a = await ruleHasPermission('create.test', policyRuleContext, databaseFactory(), options)
            expect(a).eql(true)
        });
        it('should return true if rule not available in database', async function () {
            const a = await ruleHasPermission('create.joe', policyRuleContext, databaseFactory(), options)
            expect(a).eql(true)
        });
        it('should return false if exist in database and its false', async function () {
            const a = await ruleHasPermission('create.mini', policyRuleContext, databaseFactory(), options)
            expect(a).eql(false)
        });
        it('should return false for global rule', async function () {
            const a = await ruleHasPermission('update.eth', policyRuleContext, databaseFactory(), options)
            expect(a).eql(false)
        });
    });
});
