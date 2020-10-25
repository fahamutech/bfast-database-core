import {BasicAttributesModel} from "../model/BasicAttributesModel";
import {ContextBlock} from "../model/Rules";
import {
    DatabaseAdapter,
    DatabaseBasicOptions,
    DatabaseUpdateOptions,
    DatabaseWriteOptions
} from "../adapter/DatabaseAdapter";
import {UpdateRuleRequest} from "../model/UpdateRuleRequest";
import {DeleteModel} from "../model/DeleteModel";
import {QueryModel} from "../model/QueryModel";
import {SecurityController} from "./security.controller";
import {ChangeEvent} from "mongodb";

let _database: DatabaseAdapter;
let _security: SecurityController;

export class DatabaseController {

    constructor(private readonly database: DatabaseAdapter,
                private readonly security: SecurityController) {
        _database = this.database;
        _security = this.security;
    }

    /**
     * check if given domain/collection/table name is valid name
     * @param domain {string}
     * @return Promise
     */
    async handleDomainValidation(domain: string): Promise<any> {
        if (!this.validDomain(domain)) {
            throw {
                message: `${domain} is not a valid domain name`
            }
        }
        return true;
    }

    /**
     * initiate all necessary initialization of a database like indexes etc
     * @param mandatory {boolean} pass true if you want controller to throw
     * error when database initialization fails, default is false
     * @return Promise
     */
    async init(mandatory = false): Promise<any> {
        return _database.init();
    }

    /**
     * create a user defined indexes for specified domain
     * @param domain {string}
     * @param indexes {Array}
     */
    async addIndexes(domain: string, indexes: any[]): Promise<any> {
        if (indexes && Array.isArray(indexes)) {
            return _database.createIndexes(domain, indexes);
        } else {
            throw new Error("Must supply array of indexes to be added");
        }
    }

    /**
     * remove all user defined indexes of the domain
     * @param domain {string}
     */
    async removeIndexes(domain: string): Promise<boolean> {
        return _database.dropIndexes(domain);
    }

    /**
     * list all indexes of a domain
     * @param domain {string}
     */
    async listIndexes(domain: string): Promise<any[]> {
        return _database.listIndexes(domain);
    }

    /**
     * perform a single write operation in a database
     * @param domain {string} domain/collection/table to write data to
     * @param data {Object}  a map of which represent a data to be written
     * @param context {ContextBlock} current operation context
     * @param options {DatabaseWriteOptions} database write operation options
     */
    async writeOne<T extends BasicAttributesModel>(domain: string, data: T, context: ContextBlock,
                                                   options: DatabaseWriteOptions = {bypassDomainVerification: false}): Promise<T> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        const returnFields = this.getReturnFields<T>(data);
        const sanitizedData = this.sanitize4Db(data);
        const sanitizedDataWithCreateMetadata = this.addCreateMetadata(sanitizedData, context);
        sanitizedDataWithCreateMetadata._id = await _database.writeOne<T>(domain, sanitizedDataWithCreateMetadata, context, options);
        return this.sanitize4User<T>(sanitizedDataWithCreateMetadata, returnFields) as T;
    }

    /**
     * update a record depend on update model you provide
     * @param domain {string} a domain/table/collection to work with
     * @param updateModel {UpdateRuleRequest} a map company query model and update doc
     * @param context {ContextBlock} current operation context
     * @param options {DatabaseUpdateOptions} bfast::database update options
     */
    async update(domain: string, updateModel: UpdateRuleRequest, context: ContextBlock,
                 options: DatabaseUpdateOptions = {bypassDomainVerification: false}): Promise<any> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        const returnFields = this.getReturnFields(updateModel as any);
        updateModel.update = this.sanitizeWithOperator4Db(updateModel?.update as any);
        updateModel.filter = this.sanitizeWithOperator4Db(updateModel?.filter as any);
        updateModel.update = this.addUpdateMetadata(updateModel?.update as any, context);
        const updatedDoc = await _database.update<any, any>(domain, updateModel, context, options)
        return this.sanitize4User(updatedDoc, returnFields);
    }

    /**
     * delete a record from bfast::database
     * @param domain
     * @param deleteModel
     * @param context
     * @param options
     */
    async delete(domain: string, deleteModel: DeleteModel<any>, context: ContextBlock,
                 options: DatabaseBasicOptions = {bypassDomainVerification: false}): Promise<any> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        // const returnFields = deleteModel.return;
        deleteModel.filter = this.sanitizeWithOperator4Db(deleteModel?.filter as any);
        const result = await _database.deleteOne<any, any>(domain, deleteModel, context, options);
        return this.sanitize4User(result, ["id"]);
    }

    /**
     * perform a transaction to bfast::database
     * @param operations
     */
    async transaction<V>(operations: (session: any) => Promise<any>): Promise<any> {
        return _database.transaction(operations);
    }

    /**
     * perform aggregation operation to bfast::database
     * @param domain
     * @param pipelines {Array<Object>} for now work with mongodb database only
     * @param context {ContextBlock} current operation context
     * @param options {DatabaseWriteOptions} database write operation
     */
    async aggregate(domain: string, pipelines: Object[], context: ContextBlock,
                    options: DatabaseWriteOptions = {bypassDomainVerification: false}): Promise<any> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        const results = await _database.aggregate(domain, pipelines, context, options);
        return results.map(result => this.sanitize4User(result, []));
    }

    /**
     * realtime event changes for the bfast::database
     * @param domain {string} a domain/collection/table to work with
     * @param pipeline {Array<Object>} pipeline to narrow down event listening
     * @param listener {(doc: any)=>void} a callback to be executed to respond the pipeline supplied
     * @param options {DatabaseWriteOptions}
     */
    async changes(domain: string, pipeline: any[], listener: (doc: any) => void,
                  options: DatabaseWriteOptions = {bypassDomainVerification: false}): Promise<any> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        return _database.changes(domain, pipeline, (doc: ChangeEvent) => {
            if (doc.operationType === 'insert') {
                listener({
                    name: 'create',
                    resumeToken: doc._id,
                    snapshot: this.sanitize4User(doc.fullDocument, [])
                });
            } else if (doc.operationType === 'replace') {
                listener({
                    name: 'create',
                    resumeToken: doc._id,
                    snapshot: this.sanitize4User(doc.fullDocument, [])
                });
            } else if (doc.operationType === 'update') {
                listener({
                    name: 'update',
                    resumeToken: doc._id,
                    snapshot: this.sanitize4User(doc.fullDocument, [])
                });
            } else if (doc.operationType === "delete") {
                listener({
                    name: 'delete',
                    resumeToken: doc._id,
                    snapshot: this.sanitize4User(doc.documentKey, [])
                });
            }
        });
    }

    async query(domain: string, queryModel: QueryModel<any>, context: ContextBlock,
                options: DatabaseWriteOptions = {bypassDomainVerification: false}): Promise<any> {
        const returnFields = this.getReturnFields(queryModel as any);
        const returnFields4Db = this.getReturnFields4Db(queryModel as any);
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        if (queryModel && typeof queryModel !== 'boolean' && queryModel.id && typeof queryModel.id !== 'boolean') {
            queryModel = this.sanitizeWithOperator4Db(queryModel as any);
            queryModel.filter = this.sanitizeWithOperator4Db(queryModel?.filter as any);
            queryModel.return = returnFields4Db;
            const result = await _database.findOne(domain, queryModel, context, options);
            return this.sanitize4User(result, returnFields);
        } else {
            queryModel = this.sanitizeWithOperator4Db(queryModel as any);
            queryModel.filter = this.sanitizeWithOperator4Db(queryModel?.filter as any);
            queryModel.return = returnFields4Db;
            const result = await _database.query(domain, queryModel, context, options);
            if (result && Array.isArray(result)) {
                return result.map(value => this.sanitize4User(value, returnFields));
            }
            return result;
        }
    }

    async writeMany<T extends BasicAttributesModel>(domain: string, data: T[], context: ContextBlock,
                                                    options: DatabaseWriteOptions = {bypassDomainVerification: false}): Promise<any[]> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        let returnFieldsMap = {};
        data.forEach((value, index) => {
            returnFieldsMap[index] = value?.return;
        });
        const sanitizedData = data.map(value => this.sanitize4Db(value));
        const freshData = sanitizedData.map(value => this.addCreateMetadata(value, context));
        const insertedIds = await _database.writeMany<any, object>(domain, freshData, context, options);
        Object.keys(insertedIds).forEach(index => {
            freshData[index]._id = insertedIds[index];
            freshData[index] = this.sanitize4User(freshData[index], returnFieldsMap[index]);
        });
        return freshData as any;
    }

    /**
     * add update metadata to a model before update operation in bfast::database
     * @param data
     * @param context
     */
    addUpdateMetadata<T extends BasicAttributesModel>(data: T, context?: ContextBlock): T {
        if (data && typeof data !== "boolean") {
            data['$currentDate'] = {_updated_at: true}
            return data;
        }
        return data;
    }

    /**
     * check if supplied custom domain/table/collection name is valid.
     * _User, _Token and _Policy is the domain name that reserved for internal use only
     * @param domain
     */
    validDomain(domain: string): boolean {
        return (domain !== '_User' && domain !== '_Token' && domain !== '_Policy');
    }

    /**
     * prepare data to be written to bfast::database by adding
     * create metadata
     * @param data
     * @param context
     */
    addCreateMetadata<T extends BasicAttributesModel>(data: T, context?: ContextBlock): T {
        data._created_by = context?.uid;
        data._created_at = new Date();
        data._updated_at = new Date();
        if (data && (data._id === undefined || data._id === null) && typeof data !== "boolean") {
            data._id = _security.generateUUID();
        }
        return data;
    }

    /**
     * get a return fields from a return attribute of the data
     * @param data
     */
    getReturnFields<T extends BasicAttributesModel>(data: T) {
        if (data && data.return && Array.isArray(data.return)) {
            let flag = true;
            if (data.return.length > 0) {
                data.return.forEach(value => {
                    if (typeof value !== "string") {
                        flag = false;
                    }
                });
            }
            if (flag === true) {
                return data.return;
            } else {
                return undefined;
            }
        } else {
            return undefined;
        }
    }

    /**
     * get a return fields from a return attribute of the data
     * for database query operation
     * @param data
     */
    getReturnFields4Db<T extends BasicAttributesModel>(data: T) {
        if (data && data.return && Array.isArray(data.return)) {
            let flag = true;
            if (data.return.length > 0) {
                data.return.forEach((value, index) => {
                    if (typeof value !== "string") {
                        flag = false;
                    }
                    data.return[index] = Object.keys(this.sanitize4Db({[value]: 1}))[0];
                });
            }
            if (flag === true) {
                return data.return;
            } else {
                return undefined;
            }
        } else {
            return undefined;
        }
    }

    /**
     * sanitize data before consumed by a bfast::database
     * @param data
     */
    sanitizeWithOperator4Db<T extends BasicAttributesModel>(data: T): T {
        data = this.sanitize4Db(data);
        if (!data && typeof data !== "boolean") {
            return null;
        }
        Object.keys(data).forEach(key => {
            if (key.startsWith('$')) {
                // @ts-ignore
                data[key] = this.sanitize4Db(data[key]);
            }
        });
        return data;
    }

    /**
     * sanitize data before consumed by a bfast::database
     * @param data
     */
    sanitize4Db<T extends BasicAttributesModel>(data: T): T {
        if (!data && typeof data !== "boolean") {
            return null;
        }
        if (data.return && typeof data.return !== "boolean") {
            delete data.return;
        }
        if (data && data.id && typeof data.id !== "boolean") {
            data._id = data.id;
            delete data.id;
        }

        if (data && data.createdAt && typeof data.createdAt !== "boolean") {
            data._created_at = data.createdAt;
            delete data.createdAt;
        }

        if (data && data.updatedAt && typeof data.updatedAt !== "boolean") {
            data._updated_at = data.updatedAt;
            delete data.updatedAt;
        }

        if (data && data.createdBy && typeof data.createdAt !== "boolean") {
            data._created_by = data.createdBy;
            delete data.createdBy;
        }
        return data;
    }

    /**
     * sanitize data to return to a request
     * @param data
     * @param returnFields
     */
    sanitize4User<T extends BasicAttributesModel>(data: T, returnFields: string[]): T {
        if (!data && typeof data !== "boolean") {
            return null;
        }
        if (data && typeof data._id !== "boolean") {
            data.id = data._id.toString();
            // data.objectId = data._id.toString();
            delete data._id;
        }
        if (data && typeof data._created_at !== "boolean") {
            data.createdAt = data._created_at;
            delete data._created_at;
        }
        if (data && typeof data._updated_at !== "boolean") {
            data.updatedAt = data._updated_at;
            delete data._updated_at;
        }
        if (data && typeof data._created_by !== "boolean") {
            data.createdBy = data?._created_by;
            delete data._created_by;
        }
        if (data && data._hashed_password && typeof data._hashed_password !== "boolean") {
            if (!data.password) {
                data.password = data._hashed_password;
            }
            delete data._hashed_password;
        }
        if (data && typeof data._rperm !== "boolean") {
            delete data._rperm;
        }
        if (data && typeof data._wperm !== "boolean") {
            delete data._wperm;
        }
        if (data && typeof data._acl !== "boolean") {
            delete data._acl;
        }
        let returnedData: any = {};
        if (!returnFields && typeof returnFields !== "boolean") {
            returnedData.id = data.id;
            return returnedData;
        } else if (returnFields && Array.isArray(returnFields) && returnFields.length === 0) {
            return data;
        } else {
            returnFields.forEach(value => {
                returnedData[value] = data[value]
            });
            returnedData.id = data.id;
            return returnedData;
        }
    }

}
