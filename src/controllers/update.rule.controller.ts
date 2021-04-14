import {DatabaseController} from './database.controller';
import {RulesModel} from '../model/rules.model';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';

export class UpdateRuleController {
    async update(data: {
        rules: RulesModel,
        domain: string,
        updateRuleRequest: UpdateRuleRequestModel,
        databaseController: DatabaseController,
        transactionSession: any
    }): Promise<any[]> {
        if (!data.updateRuleRequest?.update) {
            throw new Error('Please update field is required, which contains properties to update a document');
        }
        if (data.updateRuleRequest?.id) {
            const filter: any = {};
            delete data.updateRuleRequest.filter;
            filter._id = data.updateRuleRequest.id;
            data.updateRuleRequest.filter = filter;
            return await data.databaseController.update(data.domain, data.updateRuleRequest, data.rules?.context, {
                bypassDomainVerification: data.rules?.context?.useMasterKey === true,
                transaction: data.transactionSession
            });
        } else if (data.updateRuleRequest?.filter) {
            // return data.databaseController.updateMany(
            //     data.domain,
            //     data.updateRuleRequest,
            //     data.rules.context,
            //     {
            //         bypassDomainVerification: data.rules?.context?.useMasterKey === true,
            //     }
            // );
            if (data.updateRuleRequest?.filter && Object.keys(data.updateRuleRequest?.filter).length === 0) {
                throw new Error('Empty map is not supported in update rule');
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
            throw new Error('Bad data format in update rule, no filter nor id');
        }
    }
}
