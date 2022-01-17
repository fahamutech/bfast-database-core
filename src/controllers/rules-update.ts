import {RuleContext} from "../models/rule-context";
import {RuleResponse} from "../models/rule-response";
import {BFastOptions} from "../bfast-option";
import {UpdateModel} from "../models/update-model";
import {updateDataInStore, updateManyData} from "./database";
import {ruleHasPermission} from "./policy";
import {DatabaseAdapter} from "../adapters/database";

async function checkUpdatePermission(
    domain: string,databaseAdapter: DatabaseAdapter, context: RuleContext, options: BFastOptions
) {
    const allowed = await ruleHasPermission(`update.${domain}`, context, databaseAdapter, options);
    if (allowed !== true) throw {message: 'You have insufficient permission to this resource'}
}

function sanitizeUpdateModel(data: UpdateModel): UpdateModel {
    if (!data?.update) {
        throw {message: 'Please update field is required, which contains properties to update a document'};
    }
    if (!data.hasOwnProperty('id') && !data.hasOwnProperty('filter')) {
        throw {message: 'Bad data format in update rule, no filter nor id'};
    }
    if (data?.id) {
        const filter: any = {};
        delete data.filter;
        filter._id = data.id;
        data.filter = filter;
    }
    if (data?.filter && Object.keys(data?.filter).length === 0) {
        throw {message: 'Empty map is not supported in update rule'};
    }
    return data;
}

async function updateSingleDoc(
    context: RuleContext, databaseAdapter: DatabaseAdapter,
    domain: string, data: UpdateModel, options: BFastOptions
): Promise<any> {
    data = sanitizeUpdateModel(data);
    const uO = {bypassDomainVerification: context?.useMasterKey === true, transaction: null}
    return updateDataInStore(domain, data, context, databaseAdapter, uO, options);
}

async function updateManyDoc(
    context: RuleContext, databaseAdapter: DatabaseAdapter,
    domain: string, ruleData: UpdateModel[], options: BFastOptions
) {
    ruleData = ruleData.map(z => sanitizeUpdateModel(z));
    const uO = {bypassDomainVerification: context?.useMasterKey === true, transaction: null}
    return updateManyData(domain, ruleData, context, databaseAdapter, uO, options);
}

export async function updateRule(
    domain: string, ruleData, ruleResponse: RuleResponse, databaseAdapter: DatabaseAdapter,
    context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    await checkUpdatePermission(domain,databaseAdapter, context, options);
    if (ruleData && Array.isArray(ruleData)) {
        ruleResponse[`update${domain}`]
            = await updateManyDoc(context, databaseAdapter, domain, ruleData, options);
    } else {
        ruleResponse[`update${domain}`]
            = await updateSingleDoc(context, databaseAdapter, domain, ruleData, options);
    }
    return ruleResponse
}