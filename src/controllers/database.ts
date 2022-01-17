import {Basic} from '../models/basic';
import {DeleteModel} from '../models/delete-model';
import {QueryModel} from '../models/query-model';
import {generateUUID} from './security';
import {ChangesModel} from '../models/changes.model';
import {ChangesDocModel} from "../models/changes-doc.model";
import {AppEventsFactory} from "../factories/app-events";
import {BFastOptions, BFastOptionsSchema} from "../bfast-option";
import {DatabaseWriteOptions} from "../models/database-write-options";
import {DatabaseUpdateOptions} from "../models/database-update-options";
import {DatabaseBasicOptions} from "../models/database-basic-options";
import {DatabaseChangesOptions} from "../models/database-changes-options";
import {UpdateModel} from "../models/update-model";
import moment from 'moment';
import {RuleContext} from "../models/rule-context";
import {TreeController} from "bfast-database-tree";
import {validateInput} from "../utils";
import {DatabaseAdapter} from "../adapters/database";
import {StringSchema} from "../models/string";

async function handleDomainValidation(domain: string): Promise<any> {
    function validDomain(d: string): boolean {
        return (d !== '_User' && d !== '_Token' && d !== '_Policy');
    }

    if (!validDomain(domain)) throw {message: `${domain} is not a valid domain name`};
    return true;
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

async function checkPolicyInDomain(domain: string, options: DatabaseWriteOptions) {
    if (options && options.bypassDomainVerification === false) await handleDomainValidation(domain);
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

function sanitizeDate(data: any) {
    if (data && data.createdAt) {
        if (moment(data.createdAt).isValid()) {
            data.createdAt = moment(data.createdAt).toDate();
        }
    }
    if (data && data.updatedAt) {
        if (moment(data.updatedAt).isValid()) {
            data.updatedAt = moment(data.updatedAt).toDate();
        }
    }
    return data;
}

function addCreateMetadata(data: any, context: RuleContext) {
    let userUpdateDate = data.updatedAt;
    if (moment(userUpdateDate).isValid()) {
        userUpdateDate = moment(userUpdateDate).toDate();
    }
    let userCreateDate = data.createdAt;
    if (moment(userCreateDate).isValid()) {
        userCreateDate = moment(userCreateDate).toDate();
    }
    if (context) {
        data.createdBy = context.uid ? context.uid : null;
    }
    data.createdAt = userCreateDate ? userCreateDate : new Date();
    data.updatedAt = userUpdateDate ? userUpdateDate : new Date();
    if (data._id) {
        return data;
    }
    data._id = data && data.id ? data.id : generateUUID();
    delete data.id;
    return data;
}

function getReturnFields(data: any): any {
    if (data && data.return && Array.isArray(data.return)) {
        let flag = true;
        if (data.return.length > 0) {
            data.return.forEach(value => {
                if (typeof value !== 'string') {
                    flag = false;
                }
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

function sanitizeWithOperator4Db(data: any) {
    // data = sanitize4Db(data);
    if (data === null || data === undefined) {
        return null;
    }
    if (data.filter && data.filter.id) {
        data.filter._id = data.filter.id;
        delete data.filter.id;
    }
    if (data.id) {
        data._id = data.id;
        delete data.id;
    }
    return data;
}

function sanitize4Db(data: any) {
    // data = addCreateMetadata(data, null);
    if (data === null || data === undefined) {
        return null;
    }
    if (data && data.hasOwnProperty('return')) {
        delete data.return;
    }
    if (data && data.hasOwnProperty('id')) {
        data._id = data.id;
        delete data.id;
    }

    if (data && data.hasOwnProperty('_created_at')) {
        // data.createdAt = data._created_at;
        delete data._created_at;
    }

    if (data && data.hasOwnProperty('_updated_at')) {
        // data.updatedAt = data._updated_at;
        delete data._updated_at;
    }

    if (data && data.hasOwnProperty('_created_by')) {
        // data.createdBy = data._created_by;
        delete data._created_by;
    }
    return data;
}

function sanitize4User(data: any, returnFields: string[]) {
    if (data === null || data === undefined) {
        return null;
    }
    if (data && data.hasOwnProperty('_id')) {
        data.id = data._id ? (typeof data._id === 'object' ? data._id : data._id.toString().trim()) : '';
        delete data._id;
    }
    if (data && data.hasOwnProperty('_created_at')) {
        // data.createdAt = data._created_at;
        delete data._created_at;
    }
    if (data && data.hasOwnProperty('_updated_at')) {
        // data.updatedAt = data._updated_at;
        delete data._updated_at;
    }
    if (data && data.hasOwnProperty('_created_by')) {
        // data.createdBy = data?._created_by;
        delete data._created_by;
    }
    if (data && data.hasOwnProperty('_hashed_password')) {
        // if (!data.password) {
        //     data.password = data._hashed_password;
        // }
        delete data._hashed_password;
    }
    // if (data && data.hasOwnProperty('password')) {
    // if (!data.password) {
    //     data.password = data._hashed_password;
    // }
    // delete data.password;
    // }
    if (data && typeof data.hasOwnProperty('_rperm')) {
        delete data._rperm;
    }
    if (data && typeof data.hasOwnProperty('_wperm')) {
        delete data._wperm;
    }
    if (data && typeof data.hasOwnProperty('_acl')) {
        delete data._acl;
    }
    let returnedData: any = {};
    if (!Array.isArray(returnFields)) {
        return data;
    }
    if (Array.isArray(returnFields) && returnFields.length === 0) {
        return data;
    }
    if (Array.isArray(returnFields)) {
        returnFields.forEach(value => {
            returnedData[value] = data[value];
        });
        returnedData.id = data.id;
        returnedData.createdAt = data.createdAt;
        returnedData.updatedAt = data.updatedAt;
        delete returnedData._id
        return returnedData;
    }
    return data;
}

function publishChanges(domain: string, change: ChangesModel, options: BFastOptions) {
    const aI = AppEventsFactory.getInstance();
    aI.pub(aI.eventName(options.projectId, domain), change);
}

export async function initDataStore(
    databaseAdapter: DatabaseAdapter, options: BFastOptions
): Promise<any> {
    await validateInput(options, BFastOptionsSchema, 'invalid bfast options')
    return databaseAdapter.init(options);
}

export async function writeOneDataInStore<T extends Basic>(
    domain: string, data: T, context: RuleContext, databaseAdapter: DatabaseAdapter,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<T> {
    await validateInput(domain, StringSchema, 'invalid domain');
    await validateInput(data, {type: 'object'}, 'invalid data')
    await checkPolicyInDomain(domain, writeOptions);
    const returnFields = getReturnFields(data);
    const sanitizedDataWithCreateMetadata = addCreateMetadata(data, context);
    const sanitizedData: any = sanitize4Db(sanitizedDataWithCreateMetadata);
    const savedData: any = await databaseAdapter.createOneData(domain, sanitizeDate(sanitizedData), options);
    const cleanDoc: any = sanitize4User(savedData, returnFields);
    publishChanges(domain, {
        _id: cleanDoc?.id, fullDocument: cleanDoc, documentKey: cleanDoc?.id, operationType: "create"
    }, options);
    return cleanDoc;
}

export async function writeManyDataInStore<T extends Basic>(
    domain: string, data: T[], context: RuleContext, databaseAdapter: DatabaseAdapter,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<any[]> {
    await validateInput(domain, StringSchema, 'invalid domain')
    await validateInput(data, {type: 'array', items: {type: 'object'}}, 'invalid data')
    if (data.length === 0) return [];
    await checkPolicyInDomain(domain, writeOptions);
    const returnFields = getReturnFields(data[0]);
    const sanitizedData: any[] = data.map(x => {
        x = addCreateMetadata(x, context);
        x = sanitize4Db(x)
        return sanitizeDate(x);
    });
    const savedData = await databaseAdapter.createManyData(domain, sanitizedData, options)
    return savedData.map(d => {
        publishChanges(domain, {
            _id: d._id, fullDocument: d, documentKey: d._id, operationType: "create"
        }, options);
        return sanitize4User(d, returnFields)
    });
}

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

export async function updateDataInStore(
    domain: string, updateModel: UpdateModel, context: RuleContext, databaseAdapter: DatabaseAdapter,
    updateOptions: DatabaseUpdateOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<{ message: string, modified: number }> {
    await validateInput(domain, StringSchema, 'invalid domain');
    await validateInput(updateModel, {type: 'object'}, 'invalid data');
    await checkPolicyInDomain(domain, updateOptions);
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
    await checkPolicyInDomain(domain, updateOptions);
    if (updateModels.length === 0) return {message: 'done update', modified: 0};
    updateModels = await Promise.all(updateModels.map(x => sanitizeUpdateModel(x)));
    const a = await databaseAdapter.updateManyData(domain, updateModels, options);
    if (a && a.modified > 0)
        publishUpdatesChange(domain, updateModels, databaseAdapter, context, options).catch(console.log)
    return {message: 'done update', modified: a.modified};
}

export async function removeDataInStore(
    domain: string, deleteModel: DeleteModel, context: RuleContext, databaseAdapter: DatabaseAdapter,
    basicOptions: DatabaseBasicOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<any> {
    await checkPolicyInDomain(domain, basicOptions);
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

export async function transaction<S>(
    databaseAdapter: DatabaseAdapter, operations: (session: S) => Promise<any>
): Promise<any> {
    const session = await databaseAdapter.session<S>()
    return await operations(session);
}

export async function changes(
    domain: string, projectId: string, pipeline: any[], listener: (doc: ChangesDocModel) => void,
    options: DatabaseChangesOptions = {bypassDomainVerification: false, resumeToken: undefined}
): Promise<{ close: () => void }> {
    if (options && options.bypassDomainVerification === false) await handleDomainValidation(domain);
    const _listener = (doc: ChangesModel) => {
        switch (doc.operationType) {
            case 'create':
                listener({
                    name: 'create',
                    snapshot: sanitize4User(doc.fullDocument, [])
                });
                return;
            case 'update':
                listener({
                    name: 'update',
                    snapshot: sanitize4User(doc.fullDocument, [])
                });
                return;
            case 'delete':
                listener({
                    name: 'delete',
                    snapshot: sanitize4User(doc.fullDocument, [])
                });
                return;
        }
    }
    const appEventInst = AppEventsFactory.getInstance();
    const eventName = appEventInst.eventName(projectId, domain);
    appEventInst.sub(eventName, _listener);
    return {
        close: () => appEventInst.unSub(eventName, _listener)
    }
}

export async function findDataByIdInStore(
    domain: string, queryModel: QueryModel<any>, databaseAdapter: DatabaseAdapter,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<any> {
    const returnFields = getReturnFields(queryModel as any);
    const returnFields4Db = getReturnFields4Db(queryModel as any);
    await checkPolicyInDomain(domain, writeOptions);
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
    await checkPolicyInDomain(domain, writeOptions);
    queryModel = sanitizeWithOperator4Db(queryModel as any);
    queryModel.filter = sanitizeWithOperator4Db(queryModel?.filter ? queryModel.filter : {});
    queryModel.return = returnFields4Db;
    let result = await databaseAdapter.getManyData(domain, queryModel, options);
    if (result && Array.isArray(result)) return result.map(v => sanitize4User(v, returnFields));
    return result;
}

export async function aggregateDataInStore(
    table: string, pipelines: any[], databaseAdapter: DatabaseAdapter,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<any> {
    await checkPolicyInDomain(table, writeOptions);
    const results = await databaseAdapter.aggregateData(table, pipelines, options);
    return results.map(result => sanitize4User(result, []));
}


