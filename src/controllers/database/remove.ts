import {DeleteModel} from "../../models/delete-model";
import {RuleContext} from "../../models/rule-context";
import {DatabaseAdapter} from "../../adapters/database";
import {DatabaseBasicOptions} from "../../models/database-basic-options";
import {BFastOptions} from "../../bfast-option";
import {ChangesModel} from "../../models/changes.model";
import {
    checkIsAllowedDomainName,
    publishChanges,
    sanitize4User,
    sanitizeWithOperator4Db
} from "./index";
import {findDataByFilterInStore} from "./query";

export async function removeDataInStore(
    domain: string, deleteModel: DeleteModel, context: RuleContext, databaseAdapter: DatabaseAdapter,
    basicOptions: DatabaseBasicOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<any> {
    await checkIsAllowedDomainName(domain, basicOptions);
    deleteModel.filter = sanitizeWithOperator4Db(deleteModel?.filter as any);
    let result = [];
    if (deleteModel && deleteModel.id) {
        await databaseAdapter.removeOneData(domain, deleteModel.id, options);
        result.push({id: deleteModel.id});
    }
    if (deleteModel && deleteModel.filter) {
        deleteModel.return = ['id']
        let all = await findDataByFilterInStore(domain, deleteModel, context, databaseAdapter, basicOptions, options);
        const _p = all.map(async a => {
            await databaseAdapter.removeOneData(domain, a.id, options);
            return {id: a.id};
        });
        const _pa = await Promise.all(_p);
        result.push(..._pa);
    }
    return result.map(t => {
        const cleanDoc = sanitize4User(t, deleteModel.return);
        const change: ChangesModel = {_id: t?.id, fullDocument: t, documentKey: t?.id, operationType: "delete"}
        publishChanges(domain, change, options);
        return cleanDoc;
    });
}
