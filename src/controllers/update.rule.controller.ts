import {RulesModel} from '../models/rules.model';
import {UpdateRuleRequestModel} from '../models/update-rule-request.model';
import {BFastOptions} from "../bfast-database.option";
import {findByFilter, updateMany, updateOne} from "./database.controller";

export async function handleUpdateRule(
    rules: RulesModel,
    domain: string,
    updateRuleRequest: UpdateRuleRequestModel,
    transactionSession: any,
    options: BFastOptions
): Promise<any[] | string> {
    if (!updateRuleRequest?.update) {
        throw new Error('Please update field is required, which contains properties to update a document');
    }
    if (updateRuleRequest?.id) {
        const filter: any = {};
        delete updateRuleRequest.filter;
        filter._id = updateRuleRequest.id;
        updateRuleRequest.filter = filter;
        return updateOne(
            domain,
            updateRuleRequest,
            rules?.context,
            {
                bypassDomainVerification: rules?.context?.useMasterKey === true,
                transaction: transactionSession
            },
            options
        );
    } else if (updateRuleRequest?.filter) {
        if (updateRuleRequest?.filter && Object.keys(updateRuleRequest?.filter).length === 0) {
            throw new Error('Empty map is not supported in update rule');
        }
        return updateMany(
            domain,
            updateRuleRequest,
            rules.context,
            {
                bypassDomainVerification: rules?.context?.useMasterKey === true,
                transaction: transactionSession
            },
            options
        );
    } else {
        throw new Error('Bad data format in update rule, no filter nor id');
    }
}
