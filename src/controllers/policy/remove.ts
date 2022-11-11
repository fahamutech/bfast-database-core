import {RuleContext} from "../../models/rule-context";
import {DatabaseAdapter} from "../../adapters/database";
import {BFastOptions} from "../../bfast-option";
import {validateInput} from "../index";
import {StringSchema} from "../../models/string";
import {removeDataInStore} from "../database/remove";
import {sanitizePolicy4User} from "./index";

export async function removePolicyRule(
    ruleId: string, context: RuleContext, databaseAdapter: DatabaseAdapter, options: BFastOptions
) {
    await validateInput(ruleId, StringSchema, 'invalid rule id');
    const deleteModel = {
        filter: {
            ruleId: ruleId.replace('.', '%'),
        },
        return: ['id'],
    };
    const wOptions = {bypassDomainVerification: true};
    const _y89 = await removeDataInStore('_Policy', deleteModel, context, databaseAdapter, wOptions, options);
    return _y89.map(z => sanitizePolicy4User(z));
}
