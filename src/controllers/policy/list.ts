import {DatabaseAdapter} from "../../adapters/database";
import {RuleContext} from "../../models/rule-context";
import {BFastOptions} from "../../bfast-option";
import {findDataByFilterInStore} from "../database/query";
import {sanitizePolicy4User} from "./index";

export async function listPolicyRule(
    databaseAdapter: DatabaseAdapter, context: RuleContext, options: BFastOptions
) {
    const queryModel = {filter: {}, return: []}
    const wOptions = {bypassDomainVerification: true}
    const _j1 = await findDataByFilterInStore(
        '_Policy', queryModel, context, databaseAdapter, wOptions, options
    );
    return _j1.map(x => sanitizePolicy4User(x));
}
