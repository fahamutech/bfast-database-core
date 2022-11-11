import {QueryModel} from "../../models/query-model";
import {DatabaseAdapter} from "../../adapters/database";
import {DatabaseWriteOptions} from "../../models/database-write-options";
import {BFastOptions} from "../../bfast-option";
import {RuleContext} from "../../models/rule-context";
import {checkIsAllowedDomainName, getReturnFields, sanitize4Db, sanitize4User, sanitizeWithOperator4Db} from "./index";

function getReturnFields4Db(data: any): any {
    if (data && data.return && Array.isArray(data.return)) {
        let flag = true;
        if (data.return.length > 0) {
            data.return.forEach((value, index) => {
                if (typeof value !== 'string') {
                    flag = false;
                }
                data.return[index] = Object.keys(sanitize4Db({[value]: 1}))[0];
            });
        }
        if (flag === true) {
            return data.return;
        } else {
            return [];
        }
    } else {
        return [];
    }
}

export async function findDataByIdInStore(
    domain: string, queryModel: QueryModel<any>, databaseAdapter: DatabaseAdapter,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<any> {
    const returnFields = getReturnFields(queryModel as any);
    const returnFields4Db = getReturnFields4Db(queryModel as any);
    await checkIsAllowedDomainName(domain, writeOptions);
    const id = queryModel.id;
    queryModel.return = returnFields4Db;
    const data = await databaseAdapter.getOneData(domain, id, options);
    return sanitize4User(data, returnFields);
}

export async function findDataByFilterInStore(
    domain: string, queryModel: QueryModel<any>, context: RuleContext, databaseAdapter: DatabaseAdapter,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<any> {
    const returnFields = getReturnFields(queryModel as any);
    const returnFields4Db = getReturnFields4Db(queryModel as any);
    await checkIsAllowedDomainName(domain, writeOptions);
    queryModel = sanitizeWithOperator4Db(queryModel as any);
    queryModel.filter = sanitizeWithOperator4Db(queryModel?.filter ? queryModel.filter : {});
    queryModel.return = returnFields4Db;
    let result = await databaseAdapter.getManyData(domain, queryModel, options);
    if (result && Array.isArray(result)) return result.map(v => sanitize4User(v, returnFields));
    return result;
}
