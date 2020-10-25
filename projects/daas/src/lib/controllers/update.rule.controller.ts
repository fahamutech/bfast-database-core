import {DatabaseController} from "./database.controller";
import {Rules} from "../model/Rules";
import {UpdateRuleRequest} from "../model/UpdateRuleRequest";

export class UpdateRuleController {
    async update(data: {
        rules: Rules,
        domain: string,
        updateRuleRequest: UpdateRuleRequest,
        databaseController: DatabaseController,
        transactionSession: any
    }) {
        if (!data.updateRuleRequest?.update) {
            throw "Please update field is required, which contains properties to update a document"
        }
        if (data.updateRuleRequest?.id) {
            const filter: any = {};
            delete data.updateRuleRequest.filter;
            filter['_id'] = data.updateRuleRequest.id;
            data.updateRuleRequest.filter = filter;
            return await data.databaseController.update(data.domain, data.updateRuleRequest, data.rules?.context, {
                bypassDomainVerification: data.rules?.context?.useMasterKey === true,
                transaction: data.transactionSession
            });
        } else if (data.updateRuleRequest?.filter) {
            if (data.updateRuleRequest?.filter && Object.keys(data.updateRuleRequest?.filter).length === 0) {
                throw "Empty map is not supported in update rule";
            }
            const query: any[] = await data.databaseController.query(data.domain, data.updateRuleRequest, data.rules.context, {
                bypassDomainVerification: data.rules?.context?.useMasterKey === true,
                transaction: data.transactionSession
            });
            const updateResults = [];
            if (query && Array.isArray(query)) {
                for (const value of query) {
                    data.updateRuleRequest.filter = {
                        _id: value.id
                    };
                    const result = await data.databaseController.update(data.domain, data.updateRuleRequest, data.rules?.context, {
                        bypassDomainVerification: data.rules?.context?.useMasterKey === true,
                        transaction: data.transactionSession
                    });
                    updateResults.push(result);
                }
            }
            return updateResults;
        } else {
            throw "Bad data format in update rule, no filter nor id";
        }
    }
}
