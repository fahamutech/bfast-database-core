import {after, before} from "mocha";
import {assert, expect, should} from "chai";
import {handleDeleteRules, handlePolicyRule} from "./rules";
import {loadEnv} from "../utils/env";
import {extractResultFromServer} from "bfast";
import {RuleContext} from "../models/rule-context";

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
                ruleId: {$exists: true}
            }
        }
    }, {errors: {}}, loadEnv(), null)
    extractResultFromServer(a, 'delete', '_Policy')
}

describe('RulesPolicyController', function () {
    beforeEach(() => options = loadEnv())
    before(async () => await clearPolicy());
    after(async () => await clearPolicy());

    describe('add', function () {
        it('should return added policy when masterKey is valid', async function () {
            const rule = {
                context: {useMasterKey: true},
                policy: {add: {'query.*': 'return false;'}}
            }
            const results = await handlePolicyRule(rule, {errors: {}}, options);
            should().exist(results.policy);
            expect(results.policy).eql({
                add: {
                    'query.*': {
                        id: 'query.*',
                        ruleId: 'query.*',
                        ruleBody: 'return false;'
                    }
                }
            });
        });
        it('should return error message when masterKey is invalid', async function () {
            const rule = {
                context: {useMasterKey: false},
                policy: {rules: {'query.*': 'return false;'}}
            }
            // @ts-ignore
            const results = await handlePolicyRule(rule, {errors: {}}, options);
            should().exist(results.errors['policy']);
            should().not.exist(results['policy']);
            expect(results.errors['policy']['message']).equal('policy rule require masterKey');
        });
    });
    describe('list', function () {
        before(async function () {
            const rule = {
                context: {useMasterKey: true},
                policy: {add: {'query.*': 'return false;'}}
            }
            await handlePolicyRule(rule, {errors: {}}, options);
        });
        after(async function () {
            const rule = {
                context: {useMasterKey: true},
                delete_Policy: {filter: {ruleId: 'query.*'}}
            }
            await handlePolicyRule(rule, {errors: {}}, options);
        });
        it('should return list of policy when masterKey is valid', async function () {
            const rule = {
                context: {useMasterKey: true},
                policy: {list: {}}
            }
            const results = await handlePolicyRule(rule, {errors: {}}, options);
            should().exist(results.policy);
            should().exist(results.policy.list);
            expect(results.policy['list']).be.a('array');
            expect(results.policy['list']).length(1);
            expect(results.policy['list'][0]['ruleId']).equal('query.*');
        });
    });
    describe('remove', function () {
        before(async function () {
            const rule = {
                context: {useMasterKey: true},
                policy: {add: {'read.category': 'return false;'}}
            }
            await handlePolicyRule(rule, {errors: {}}, options);
        });
        after(async function () {
            const rule = {
                context: {useMasterKey: true},
                delete_Policy: {filter: {ruleId: 'read.category'}}
            }
            await handlePolicyRule(rule, {errors: {}}, options);
        });
        it('should removeDataInStore a policy when masterKey is valid', async function () {
            const results = await handlePolicyRule({
                    context: {useMasterKey: true},
                    policy: {remove: {ruleId: 'read.category'}}
                }, {errors: {}},
                options
            );
            should().exist(results.policy);
            should().exist(results.policy.remove);
            expect(results.policy.remove[0].id).equal('read.category');
        });
        it('should return empty map when removeDataInStore non exist rule', async function () {
            const rule = {
                context: {useMasterKey: true},
                policy: {remove: {ruleId: 'create.category'}}
            }
            const results = await handlePolicyRule(rule, {errors: {}}, options);
            should().exist(results.policy);
            expect(results.policy.remove).eql([]);
        });
    });

});
