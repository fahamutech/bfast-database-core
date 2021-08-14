import {BasicAttributesModel} from '../model/basic-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {
    DatabaseAdapter,
    DatabaseBasicOptions,
    DatabaseChangesOptions,
    DatabaseUpdateOptions,
    DatabaseWriteOptions
} from '../adapters/database.adapter';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {DeleteModel} from '../model/delete-model';
import {QueryModel} from '../model/query-model';
import {SecurityController} from './security.controller';
import {ChangesModel} from '../model/changes.model';
import {ChangeStream} from 'mongodb';

export class DatabaseController {

    constructor(private readonly database: DatabaseAdapter,
                private readonly security: SecurityController) {
    }

    /**
     * check if given domain/collection/table name is valid name
     * @param domain - resource name
     * @return Promise
     */
    async handleDomainValidation(domain: string): Promise<any> {
        if (!this.validDomain(domain)) {
            throw {
                message: `${domain} is not a valid domain name`
            };
        }
        return true;
    }

    /**
     * initiate all necessary initialization of a database like indexes etc
     * @param mandatory - pass true if you want controller to throw
     * error when database initialization fails, default is false
     * @return Promise
     */
    async init(mandatory = false): Promise<any> {
        return this.database.init();
    }

    /**
     * create a user defined indexes for specified domain
     * @param domain -
     * @param indexes -
     */
    async addIndexes(domain: string, indexes: any[]): Promise<any> {
        if (indexes && Array.isArray(indexes)) {
            return this.database.createIndexes(domain, indexes);
        } else {
            throw new Error('Must supply array of indexes to be added');
        }
    }

    /**
     * remove all user defined indexes of the domain
     * @param domain - resource name
     */
    async removeIndexes(domain: string): Promise<boolean> {
        return this.database.dropIndexes(domain);
    }

    /**
     * list all indexes of a domain
     * @param domain - resource name
     */
    async listIndexes(domain: string): Promise<any[]> {
        return this.database.listIndexes(domain);
    }

    /**
     * perform a single write operation in a database
     * @param domain domain/collection/table to write data to
     * @param data a map of which represent a data to be written
     * @param context current operation context
     * @param options database write operation options
     */
    async writeOne<T extends BasicAttributesModel>(
        domain: string,
        data: T,
        context: ContextBlock,
        options: DatabaseWriteOptions = {bypassDomainVerification: false}
    ): Promise<T> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        const returnFields = this.getReturnFields<T>(data);
        const sanitizedData = this.sanitize4Db(data);
        const sanitizedDataWithCreateMetadata = this.addCreateMetadata(sanitizedData, context);
        const doc = await this.database.writeOne<T>(domain, sanitizedDataWithCreateMetadata, context, options);
        return this.sanitize4User<T>(doc, returnFields, []) as T;
    }

    async writeMany<T extends BasicAttributesModel>(
        domain: string,
        data: T[],
        context: ContextBlock,
        options: DatabaseWriteOptions = {bypassDomainVerification: false}
    ): Promise<any[]> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        const freshData = data.map(value => this.addCreateMetadata(value, context));
        const returnFieldsMap = freshData.reduce((a, b) => {
            a[b._id] = b.return;
            return a;
        }, {});
        const sanitizedData = freshData.map(value => this.sanitize4Db(value));
        const docs = await this.database.writeMany<any>(domain, sanitizedData, context, options);
        return docs.map(x1 => this.sanitize4User(x1, returnFieldsMap[x1._id], []));
    }

    /**
     * update a record depend on update model you provide
     * @param domain - a domain/table/collection to work with
     * @param updateModel - a map company query model and update doc
     * @param context - current operation context
     * @param options - bfast::database update options
     */
    async updateOne(
        domain: string,
        updateModel: UpdateRuleRequestModel,
        context: ContextBlock,
        options: DatabaseUpdateOptions = {bypassDomainVerification: false}
    ): Promise<any> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        if (updateModel.upsert === true) {
            if (!updateModel.update.hasOwnProperty('$set')) {
                updateModel.update.$set = {id: this.security.generateUUID()}
            }
        }
        const returnFields = this.getReturnFields(updateModel as any);
        updateModel.update = this.sanitizeWithOperator4Db(updateModel?.update as any);
        updateModel.filter = this.sanitizeWithOperator4Db(updateModel?.filter as any);
        updateModel.update = this.addUpdateMetadata(updateModel?.update as any, context);
        options.dbOptions = updateModel && updateModel.options ? updateModel.options : {};
        const updatedDoc = await this.database.updateOne<any, any>(domain, updateModel, context, options);
        return this.sanitize4User(updatedDoc, returnFields, []);
    }

    async updateMany(
        domain: string,
        updateModel: UpdateRuleRequestModel,
        context: ContextBlock,
        options: DatabaseUpdateOptions = {bypassDomainVerification: false}
    ): Promise<any[]> {
        if (
            updateModel.filter &&
            typeof updateModel.filter === 'object' &&
            Object.keys(updateModel.filter).length > 0
        ) {
            if (options && options.bypassDomainVerification === false) {
                await this.handleDomainValidation(domain);
            }
            if (updateModel.upsert === true) {
                if (!updateModel.update.hasOwnProperty('$set')) {
                    updateModel.update.$set = {}
                }
                if (!updateModel.update.$set.hasOwnProperty('_id')) {
                    updateModel.update.$set._id = this.security.generateUUID();
                }
            }
            updateModel.update = this.sanitizeWithOperator4Db(updateModel?.update as any);
            updateModel.filter = this.sanitizeWithOperator4Db(updateModel?.filter as any);
            updateModel.update = this.addUpdateMetadata(updateModel?.update as any, context);
            options.dbOptions = updateModel && updateModel.options ? updateModel.options : {};
            const docs = await this.database.updateMany(
                domain,
                updateModel,
                context,
                options
            );
            return docs.map(_t1 => this.sanitize4User(_t1, updateModel.return, []));
        }
        throw {message: 'you must supply filter object in update model'};
    }

    /**
     * delete a record from bfast::database
     * @param domain - resource name
     * @param deleteModel - query for document to delete
     * @param context - current context
     * @param options - configurations
     */
    async delete(
        domain: string,
        deleteModel: DeleteModel<any>,
        context: ContextBlock,
        options: DatabaseBasicOptions = {bypassDomainVerification: false}
    ): Promise<any> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        deleteModel.filter = this.sanitizeWithOperator4Db(deleteModel?.filter as any);
        const result = await this.database.delete<any>(domain, deleteModel, context, options);
        return result.map(t => this.sanitize4User(t, deleteModel.return, []));
    }

    /**
     * perform a transaction to bfast::database
     * @param operations - callback to return operations to perform
     */
    async transaction<S>(operations: (session: S) => Promise<any>): Promise<any> {
        return this.database.transaction(operations);
    }

    /**
     * perform aggregation operation to bfast::database
     * @param domain - resource name
     * @param pipelines - for now work with mongodb database only
     * @param hashes
     * @param context - current operation context
     * @param options - database write operation
     */
    async aggregate(
        domain: string,
        pipelines: any[],
        hashes: string[],
        context: ContextBlock,
        options: DatabaseWriteOptions = {bypassDomainVerification: false},
    ): Promise<any> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        const results = await this.database.aggregate(domain, pipelines, context, options);
        return results.map(result => this.sanitize4User(result, [], hashes));
    }

    /**
     * realtime event changes for the bfast::database
     * @param domain - a domain/collection/table to work with
     * @param pipeline - pipeline to narrow down event listening
     * @param listener - a callback to be executed to respond the pipeline supplied
     * @param options - write operation options
     */
    async changes(
        domain: string,
        pipeline: any[],
        listener: (doc: any) => void,
        options: DatabaseChangesOptions = {bypassDomainVerification: false, resumeToken: undefined}
    ): Promise<ChangeStream> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        return this.database.changes(domain, pipeline, (doc: ChangesModel) => {
            if (doc.operationType === 'insert') {
                listener({
                    name: 'create',
                    resumeToken: doc._id,
                    snapshot: this.sanitize4User(doc.fullDocument, [], [])
                });
            } else if (doc.operationType === 'replace') {
                listener({
                    name: 'create',
                    resumeToken: doc._id,
                    snapshot: this.sanitize4User(doc.fullDocument, [], [])
                });
            } else if (doc.operationType === 'update') {
                listener({
                    name: 'update',
                    resumeToken: doc._id,
                    snapshot: this.sanitize4User(doc.fullDocument, [], [])
                });
            } else if (doc.operationType === 'delete') {
                listener({
                    name: 'delete',
                    resumeToken: doc._id,
                    snapshot: this.sanitize4User(doc.documentKey, [], [])
                });
            }
        }, options.resumeToken);
    }

    async query(
        domain: string,
        queryModel: QueryModel<any>,
        context: ContextBlock,
        options: DatabaseWriteOptions = {bypassDomainVerification: false}
    ): Promise<any> {
        const returnFields = this.getReturnFields(queryModel as any);
        const returnFields4Db = this.getReturnFields4Db(queryModel as any);
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        if (queryModel && queryModel.id) {
            queryModel = this.sanitizeWithOperator4Db(queryModel as any);
            queryModel.filter = this.sanitizeWithOperator4Db(queryModel?.filter as any);
            queryModel.return = returnFields4Db;
            const result = await this.database.findOne(domain, queryModel, context, options);
            return this.sanitize4User(result, returnFields, queryModel?.hashes);
        } else {
            queryModel = this.sanitizeWithOperator4Db(queryModel as any);
            queryModel.filter = this.sanitizeWithOperator4Db(queryModel?.filter as any);
            queryModel.return = returnFields4Db;
            const result = await this.database.query(domain, queryModel, context, options);
            if (result && Array.isArray(result)) {
                return result.map(value => this.sanitize4User(value, returnFields, queryModel?.hashes));
            }
            return result;
        }
    }

    /**
     * add update metadata to a model before update operation in bfast::database
     * @param data
     * @param context
     */
    addUpdateMetadata(
        data: any,
        context?: ContextBlock
    ): any {
        if (data && typeof data !== 'boolean') {
            // data.$currentDate = {_updated_at: true};
            if (data.$set) {
                data.$set._updated_at = data.$set._updated_at ? data.$set._updated_at : new Date();
            } else if (data.$inc) {
                data.$set = {};
                data.$set._updated_at = new Date();
            }
            return data;
        }
        return data;
    }

    /**
     * check if supplied custom domain/table/collection name is valid.
     * _User, _Token and _Policy is the domain name that reserved for internal use only
     * @param domain -
     */
    validDomain(domain: string): boolean {
        return (domain !== '_User' && domain !== '_Token' && domain !== '_Policy');
    }

    /**
     * prepare data to be written to bfast::database by adding
     * create metadata
     * @param data -
     * @param context -
     */
    addCreateMetadata<T extends BasicAttributesModel>(
        data: T,
        context?: ContextBlock
    ): T {
        data._created_by = context?.uid;
        data._created_at = data && data._created_at ? data._created_at : new Date();
        data._updated_at = data && data._updated_at ? data._updated_at : new Date();
        if (data && !data.hasOwnProperty('_id')) {
            data._id = this.security.generateUUID();
        }
        return data;
    }

    /**
     * get a return fields from a return attribute of the data
     * @param data -
     */
    getReturnFields<T extends BasicAttributesModel>(data: T): any {
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
                return undefined;
            }
        } else {
            return undefined;
        }
    }

    /**
     * get a return fields from a return attribute of the data
     * for database query operation
     * @param data -
     */
    getReturnFields4Db<T extends BasicAttributesModel>(data: T): any {
        if (data && data.return && Array.isArray(data.return)) {
            let flag = true;
            if (data.return.length > 0) {
                data.return.forEach((value, index) => {
                    if (typeof value !== 'string') {
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
     * @param data -
     */
    sanitizeWithOperator4Db<T extends BasicAttributesModel>(data: T): T {
        data = this.sanitize4Db(data);
        if (data === null || data === undefined) {
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
     * @param data -
     */
    sanitize4Db<T extends BasicAttributesModel>(data: T): T {
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

        if (data && data.hasOwnProperty('createdAt')) {
            data._created_at = data.createdAt;
            delete data.createdAt;
        }

        if (data && data.hasOwnProperty('updatedAt')) {
            data._updated_at = data.updatedAt;
            delete data.updatedAt;
        }

        if (data && data.hasOwnProperty('createdBy')) {
            data._created_by = data.createdBy;
            delete data.createdBy;
        }
        return data;
    }

    /**
     * sanitize data to return to a request
     * @param data -
     * @param returnFields -
     * @param hashes
     */
    sanitize4User<T extends BasicAttributesModel>(
        data: T,
        returnFields: string[],
        hashes: string[],
    ): T {
        if (data === null || data === undefined) {
            return null;
        }
        if (data && data.hasOwnProperty('_id')) {
            data.id = data._id ? (typeof data._id === 'object' ? data._id : data._id.toString()) : '';
            delete data._id;
        }
        if (data && data.hasOwnProperty('_created_at')) {
            data.createdAt = data._created_at;
            delete data._created_at;
        }
        if (data && data.hasOwnProperty('_updated_at')) {
            data.updatedAt = data._updated_at;
            delete data._updated_at;
        }
        if (data && data.hasOwnProperty('_created_by')) {
            data.createdBy = data?._created_by;
            delete data._created_by;
        }
        if (data && data.hasOwnProperty('_hashed_password')) {
            if (!data.password) {
                data.password = data._hashed_password;
            }
            delete data._hashed_password;
        }
        if (data && typeof data.hasOwnProperty('_rperm')) {
            delete data._rperm;
        }
        if (data && typeof data.hasOwnProperty('_wperm')) {
            delete data._wperm;
        }
        if (data && typeof data.hasOwnProperty('_acl')) {
            delete data._acl;
        }
        if (!hashes) {
            hashes = [];
        }
        let returnedData: any = {};
        if (!returnFields && typeof returnFields !== 'boolean') {
            returnedData.id = data.id;
        } else if (returnFields && Array.isArray(returnFields) && returnFields.length === 0) {
            returnedData = data;
        } else {
            returnFields.forEach(value => {
                returnedData[value] = data[value];
            });
            returnedData.id = data.id;
            returnedData.createdAt = data.createdAt;
            returnedData.updatedAt = data.updatedAt;
        }

        if (returnedData === null || returnedData === undefined) {
            return null;
        }
        const dataHash = this.security.sha256OfObject(returnedData);
        const exists = hashes.filter(h => h === dataHash);
        if (exists.length === 0) {
            return returnedData;
        } else if (exists.length === 1) {
            return dataHash as any;
        } else {
            return returnedData;
        }
    }

}
