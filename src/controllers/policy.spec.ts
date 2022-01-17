import {addPolicyRule, listPolicyRule, removePolicyRule, ruleHasPermission} from "./policy";
import {expect} from "chai";
import {RuleContext} from "../models/rule-context";
import {loadEnv} from "../utils/env";
import {handleDeleteRules} from "./rules";
import {extractResultFromServer} from "bfast";
import {databaseFactory} from "../test";

const ruleContext: RuleContext = {
    applicationId: 'bfast',
    useMasterKey: true
}
let options;

async function clearPolicy() {
    ruleContext.useMasterKey = true
    const a = await handleDeleteRules({
        context: ruleContext,
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
    describe('addPolicyRule', function () {
        it('should add a policy', async function () {
            const policy: any =
                await addPolicyRule("create.test", "return false;", databaseFactory(),ruleContext, loadEnv());
            expect(policy).eql({
                id: "create.test",
                ruleId: "create.test",
                ruleBody: "return false;"
            });
        });
        it('should update if already exist', async function () {
            const policy: any =
                await addPolicyRule("create.test", "return true;", databaseFactory(), ruleContext, loadEnv());
            expect(policy).eql({
                id: "create.test",
                ruleId: "create.test",
                ruleBody: "return true;"
            });
        });
    });
    describe('listPolicyRule', function () {
        it('should list all policy', async function () {
            const policies = await listPolicyRule(databaseFactory(),ruleContext, options)
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
    describe('ruleHasPermission', function () {
        before(async () => {
            options = loadEnv()
            await addPolicyRule('create.mini', 'return false;', databaseFactory(), ruleContext, options)
            await addPolicyRule('update.*', 'return false;', databaseFactory(), ruleContext, options)
            ruleContext.useMasterKey = false
        })
        after(() => ruleContext.useMasterKey = true)
        it('should return true if action permitted', async function () {
            const a = await ruleHasPermission('create.test', ruleContext, databaseFactory(), options)
            expect(a).eql(true)
        });
        it('should return true if rule not available in database', async function () {
            const a = await ruleHasPermission('create.joe', ruleContext, databaseFactory(), options)
            expect(a).eql(true)
        });
        it('should return false if exist in database and its false', async function () {
            const a = await ruleHasPermission('create.mini', ruleContext, databaseFactory(), options)
            expect(a).eql(false)
        });
        it('should return false for global rule', async function () {
            const a = await ruleHasPermission('update.eth', ruleContext, databaseFactory(), options)
            expect(a).eql(false)
        });
    });
    describe('removePolicyRule', function () {
        it('should remove previous rule', async function () {
            const a = await removePolicyRule('create.test', ruleContext, databaseFactory(), options);
            expect(a).be.a('array');
            expect(a[0].id).eql('create.test');
            const c = await listPolicyRule(databaseFactory(),ruleContext, options);
            expect(c).length(2)
        });
        it('should not remove not exist rule', async function () {
            const a = await removePolicyRule('create.na', ruleContext, databaseFactory(), options);
            expect(a).be.a('array');
            expect(a).length(0)
        });
    });
});
