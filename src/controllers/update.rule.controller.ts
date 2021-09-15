import {DatabaseController} from './database.controller';
import {RulesModel} from '../model/rules.model';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {BFastDatabaseOptions} from "../bfast-database.option";
import {DatabaseAdapter} from "../adapters/database.adapter";
import {SecurityController} from "./security.controller";

export class UpdateRuleController {
    async update(
        rules: RulesModel,
        domain: string,
        databaseAdapter: DatabaseAdapter,
        updateRuleRequest: UpdateRuleRequestModel,
        databaseController: DatabaseController,
        securityController: SecurityController,
        transactionSession: any,
        options: BFastDatabaseOptions
    ): Promise<any[] | string> {
        if (!updateRuleRequest?.update) {
            throw new Error('Please update field is required, which contains properties to update a document');
        }
        if (updateRuleRequest?.id) {
            const filter: any = {};
            delete updateRuleRequest.filter;
            filter._id = updateRuleRequest.id;
            updateRuleRequest.filter = filter;
            return databaseController.updateOne(
                domain,
                updateRuleRequest,
                databaseAdapter,
                securityController,
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
            return databaseController.updateMany(
                domain,
                updateRuleRequest,
                databaseAdapter,
                securityController,
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
}
