import {DatabaseAdapter} from "../../adapters/database";
import {RuleContext} from "../../models/rule-context";
import {BFastOptions} from "../../bfast-option";
import {validateInput} from "../index";
import {StringSchema} from "../../models/string";
import {updateDataInStore} from "../database/update";
import {policyDomainName, sanitizePolicy4User} from "./index";

function encodeDot(data: string) {
    return data.replace('.', '%')
}

export async function addPolicyRule(
    ruleId: string, rule: string, databaseAdapter: DatabaseAdapter, context: RuleContext, options: BFastOptions
): Promise<any> {
    await validateInput(ruleId, StringSchema, 'ruleId is invalid');
    await validateInput(rule, StringSchema, 'rule is invalid');
    const policy = {
        id: encodeDot(ruleId).concat('%id'),
        ruleId: encodeDot(ruleId),
        ruleBody: encodeDot(rule),
        return: [],
        createdAt: new Date()
    };
    const wOptions = {
        bypassDomainVerification: context && context.useMasterKey === true
    }
    const updateModel = {
        id: policy.id,
        filter: {},
        upsert: true,
        update: {
            $set: policy
        }
    }
    const _p1 = await updateDataInStore(policyDomainName, updateModel, context, databaseAdapter, wOptions, options);
    if (_p1.modified > 0) {
        delete policy.return;
        delete policy.createdAt;
        return sanitizePolicy4User(policy);
    }
    return null;
}
