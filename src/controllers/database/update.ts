import {UpdateModel} from "../../models/update-model";
import {RuleContext} from "../../models/rule-context";
import {DatabaseAdapter} from "../../adapters/database";
import {DatabaseUpdateOptions} from "../../models/database-update-options";
import {BFastOptions} from "../../bfast-option";
import {validateInput} from "../index";
import {StringSchema} from "../../models/string";
import {
    checkIsAllowedDomainName,
    publishChanges, sanitize4Db,
    sanitizeDate,
    sanitizeWithOperator4Db
} from "./index";
import {ChangesModel} from "../../models/changes.model";
import {generateUUID} from "../security/security";
import {TreeController} from "bfast-database-tree";
import moment from "moment/moment";
import {findDataByFilterInStore, findDataByIdInStore} from "./query";

async function publishUpdateChange(
    domain: string, updateModel: UpdateModel, databaseAdapter: DatabaseAdapter, context: RuleContext, options: BFastOptions
) {
    const updateOptions = {bypassDomainVerification: false}
    if (updateModel && updateModel.filter._id) {
        const rule = {id: updateModel.filter._id, return: []}
        const cleanDoc = await findDataByIdInStore(domain, rule, databaseAdapter, updateOptions, options);
        const change: ChangesModel = {
            _id: cleanDoc.id, fullDocument: cleanDoc, operationType: "update", documentKey: cleanDoc.id
        }
        publishChanges(domain, change, options);
    } else {
        const rule = {return: [], filter: updateModel.filter}
        const cleanDocs = await findDataByFilterInStore(
            domain, rule, context, databaseAdapter, updateOptions, options
        );
        cleanDocs.forEach(z => {
            const change: ChangesModel = {_id: z.id, fullDocument: z, operationType: "update", documentKey: z.id}
            publishChanges(domain, change, options);
        });
    }
}

async function publishUpdatesChange(
    domain: string, updateModels: UpdateModel[], databaseAdapter: DatabaseAdapter, context: RuleContext, options: BFastOptions
) {
    for (const updateModel of updateModels) {
        publishUpdateChange(domain, updateModel, databaseAdapter, context, options).catch(console.log)
    }
}

function altUpdateModel(updateModel: UpdateModel): UpdateModel {
    updateModel.update = sanitizeWithOperator4Db(updateModel?.update as any);
    updateModel.filter = sanitizeWithOperator4Db(updateModel?.filter as any);
    updateModel.update = addUpdateMetadata(updateModel?.update as any);
    return updateModel;
}

function addUpdateMetadata(data: any): any {
    if (data && typeof data !== 'boolean') {
        if (data.$set) {
            let userDate = data.$set.updatedAt;
            if (moment(userDate).isValid()) {
                userDate = moment(userDate).toDate();
            }
            data.$set.updatedAt = userDate ? userDate : new Date();
            data.$set = sanitize4Db(data.$set);
        } else {
            data.$set = {};
            data.$set.updatedAt = new Date();
        }
        delete data.$set._id;
        return data;
    }
    return data;
}

async function sanitizeUpdateModel(uModel: UpdateModel): Promise<UpdateModel> {
    let updateModel = JSON.parse(JSON.stringify(uModel));
    if (updateModel.upsert === true)
        if (!updateModel.update.hasOwnProperty('$set'))
            updateModel.update.$set = {_id: updateModel.id ? updateModel.id : generateUUID()};
    updateModel = altUpdateModel(updateModel);
    updateModel.update.$set = sanitizeDate(updateModel.update.$set);
    let filter: any = {};
    if (updateModel && typeof updateModel.filter === "object" && updateModel.filter) filter = updateModel.filter;
    if (updateModel && updateModel.id) filter._id = updateModel.id;
    updateModel.filter = filter;
    if (typeof updateModel?.update?.$inc === "object") {
        let iQ = await new TreeController().query('', updateModel.update.$inc);
        Object.keys(iQ).forEach(x => {
            iQ[x.substring(1, x.length).replace('/', '.')] = iQ[x];
            delete iQ[x];
        });
        updateModel.update.$inc = iQ;
    }
    return updateModel;
}

export async function updateDataInStore(
    domain: string, updateModel: UpdateModel, context: RuleContext, databaseAdapter: DatabaseAdapter,
    updateOptions: DatabaseUpdateOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<{ message: string, modified: number }> {
    await validateInput(domain, StringSchema, 'invalid domain');
    await validateInput(updateModel, {type: 'object'}, 'invalid data');
    await checkIsAllowedDomainName(domain, updateOptions);
    updateModel = await sanitizeUpdateModel(updateModel);
    const a = await databaseAdapter.updateOneData(domain, updateModel, options);
    if (a && a.modified > 0)
        publishUpdateChange(domain, updateModel, databaseAdapter, context, options).catch(console.log)
    return {message: 'done update', modified: a.modified};
}

export async function updateManyData(
    domain: string, updateModels: UpdateModel[], context: RuleContext, databaseAdapter: DatabaseAdapter,
    updateOptions: DatabaseUpdateOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<{ message: string, modified: number }> {
    await validateInput(domain, StringSchema, 'invalid domain');
    await validateInput(updateModels, {type: 'array', items: {type: 'object'}}, 'invalid data');
    await checkIsAllowedDomainName(domain, updateOptions);
    if (updateModels.length === 0) return {message: 'done update', modified: 0};
    updateModels = await Promise.all(updateModels.map(x => sanitizeUpdateModel(x)));
    const a = await databaseAdapter.updateManyData(domain, updateModels, options);
    if (a && a.modified > 0)
        publishUpdatesChange(domain, updateModels, databaseAdapter, context, options).catch(console.log)
    return {message: 'done update', modified: a.modified};
}
