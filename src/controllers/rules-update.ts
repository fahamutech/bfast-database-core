import {RuleContext} from "../models/rule-context";
import {RuleResponse} from "../models/rule-response";
import {BFastOptions} from "../bfast-option";
import {UpdateModel} from "../models/update-model";
import {updateDataInStore, updateManyData} from "./database.controller";
import {ruleHasPermission} from "./policy";

async function checkUpdatePermission(domain: string, context: RuleContext, options: BFastOptions) {
    const allowed = await ruleHasPermission(`update.${domain}`, context, options);
    if (allowed !== true) {
        throw {message: 'You have insufficient permission to this resource'};
    }
}

function sanitizeUpdateModel(data: UpdateModel): UpdateModel {
    if (!data?.update) {
        throw {message: 'Please updateUserInStore field is required, which contains properties to updateUserInStore a document'};
    }
    if (!data.hasOwnProperty('id') && !data.hasOwnProperty('filter')) {
        throw {message: 'Bad data format in updateUserInStore rule, no filter nor id'};
    }
    if (data?.id) {
        const filter: any = {};
        delete data.filter;
        filter._id = data.id;
        data.filter = filter;
    }
    if (data?.filter && Object.keys(data?.filter).length === 0) {
        throw {message: 'Empty map is not supported in updateUserInStore rule'};
    }
    return data;
}

async function updateSingleDoc(
    context: RuleContext,
    domain: string, data: UpdateModel, options: BFastOptions
): Promise<any> {
    data = sanitizeUpdateModel(data);
    const uO = {bypassDomainVerification: context?.useMasterKey === true, transaction: null}
    return updateDataInStore(domain, data, context, uO, options);
}

async function updateManyDoc(context: RuleContext, domain: string, ruleData: UpdateModel[], options: BFastOptions) {
    ruleData = ruleData.map(z => sanitizeUpdateModel(z));
    const uO = {bypassDomainVerification: context?.useMasterKey === true, transaction: null}
    return updateManyData(domain, ruleData, context, uO, options);
}

export async function updateRule(
    domain: string, ruleData, ruleResponse: RuleResponse, context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    await checkUpdatePermission(domain, context, options);
    if (ruleData && Array.isArray(ruleData)) {
        ruleResponse[`update${domain}`]
            = await updateManyDoc(context, domain, ruleData, options);
    } else {
        ruleResponse[`update${domain}`]
            = await updateSingleDoc(context, domain, ruleData, options);
    }
    return ruleResponse
}