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
import {ChangesDocModel} from "../model/changes-doc.model";
import {AppEventsFactory} from "../factory/app-events.factory";
import {ConstUtil} from "../utils/const.util";
import {BFastDatabaseOptions} from "../bfast-database.option";

export class DatabaseController {

    constructor() {
    }

    async handleDomainValidation(domain: string): Promise<any> {
        if (!this.validDomain(domain)) {
            throw {
                message: `${domain} is not a valid domain name`
            };
        }
        return true;
    }

    async init(
        database: DatabaseAdapter,
        options: BFastDatabaseOptions
    ): Promise<any> {
        return database.init(options);
    }

    async writeOne<T extends BasicAttributesModel>(
        domain: string,
        data: T,
        cids: boolean,
        database: DatabaseAdapter,
        security: SecurityController,
        context: ContextBlock,
        options: DatabaseWriteOptions = {bypassDomainVerification: false},
        configs: BFastDatabaseOptions
    ): Promise<T> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        const returnFields = this.getReturnFields<T>(data);
        const sanitizedDataWithCreateMetadata = this.addCreateMetadata(data, security, context);
        const sanitizedData = this.sanitize4Db(sanitizedDataWithCreateMetadata);
        const doc = await database.writeOne<T>(
            domain,
            sanitizedData,
            cids,
            context,
            configs
        );
        const cleanDoc = this.sanitize4User<T>(doc, returnFields, [], false, security) as T;
        this.publishChanges(domain, {
            _id: doc?._id,
            fullDocument: doc,
            documentKey: doc?._id,
            operationType: "create"
        });
        return cleanDoc;
    }

    async writeMany<T extends BasicAttributesModel>(
        domain: string,
        data: T[],
        cids: boolean,
        database: DatabaseAdapter,
        security: SecurityController,
        context: ContextBlock,
        options: DatabaseWriteOptions = {bypassDomainVerification: false},
        configs: BFastDatabaseOptions
    ): Promise<any[]> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        const freshData = data.map(value => this.addCreateMetadata(value, security, context));
        const returnFieldsMap = freshData.reduce((a, b) => {
            a[b._id] = b.return;
            return a;
        }, {});
        const sanitizedData = freshData.map(value => this.sanitize4Db(value));
        const docs = await database.writeMany<any>(domain, sanitizedData, cids, context, configs);
        return docs.map(x1 => {
            const cleanDoc = this.sanitize4User(x1, returnFieldsMap[x1._id], [], false, security);
            this.publishChanges(domain, {
                _id: x1?._id,
                fullDocument: x1,
                documentKey: x1?._id,
                operationType: "create"
            });
            return cleanDoc;
        });
    }

    async updateOne(
        domain: string,
        updateModel: UpdateRuleRequestModel,
        database: DatabaseAdapter,
        security: SecurityController,
        context: ContextBlock,
        options: DatabaseUpdateOptions = {bypassDomainVerification: false},
        configs: BFastDatabaseOptions
    ): Promise<any> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        if (updateModel.upsert === true) {
            if (!updateModel.update.hasOwnProperty('$set')) {
                updateModel.update.$set = {id: security.generateUUID()}
            }
        }
        const returnFields = this.getReturnFields(updateModel as any);
        updateModel = this.altUpdateModel(updateModel, context);
        options.dbOptions = updateModel && updateModel.options ? updateModel.options : {};
        const updatedDoc = await database.updateOne<any, any>(domain, updateModel, context, configs);
        const cleanDoc = this.sanitize4User(updatedDoc, returnFields, [], updateModel.cids, security);
        this.publishChanges(domain, {
            _id: updatedDoc?._id,
            fullDocument: updatedDoc,
            documentKey: updatedDoc?._id,
            operationType: "update"
        });
        return cleanDoc;
    }

    private altUpdateModel(updateModel: UpdateRuleRequestModel, context: ContextBlock) {
        updateModel.update = this.sanitizeWithOperator4Db(updateModel?.update as any);
        updateModel.filter = this.sanitizeWithOperator4Db(updateModel?.filter as any);
        updateModel.update = this.addUpdateMetadata(updateModel?.update as any, context);
        return updateModel;
    }

    async updateMany(
        domain: string,
        updateModel: UpdateRuleRequestModel,
        database: DatabaseAdapter,
        security: SecurityController,
        context: ContextBlock,
        options: DatabaseUpdateOptions = {bypassDomainVerification: false},
        configs: BFastDatabaseOptions
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
                    updateModel.update.$set._id = security.generateUUID();
                }
            }
            updateModel = this.altUpdateModel(updateModel, context);
            options.dbOptions = updateModel && updateModel.options ? updateModel.options : {};
            const docs = await database.updateMany(
                domain,
                updateModel,
                context,
                configs
            );
            return docs.map(_t1 => {
                const cleanDoc = this.sanitize4User(_t1, updateModel.return, [], updateModel.cids, security);
                this.publishChanges(domain, {
                    _id: _t1?._id,
                    fullDocument: _t1,
                    documentKey: _t1?._id,
                    operationType: "update"
                });
                return cleanDoc;
            });
        }
        throw {message: 'you must supply filter object in update model'};
    }

    async delete(
        domain: string,
        deleteModel: DeleteModel<any>,
        database: DatabaseAdapter,
        security: SecurityController,
        context: ContextBlock,
        options: DatabaseBasicOptions = {bypassDomainVerification: false},
        configs: BFastDatabaseOptions
    ): Promise<any> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        deleteModel.filter = this.sanitizeWithOperator4Db(deleteModel?.filter as any);
        const result = await database.delete<any>(domain, deleteModel, context, configs);
        return result.map(t => {
            const cleanDoc = this.sanitize4User(t, deleteModel.return, [], false, security);
            this.publishChanges(domain, {
                _id: t?._id,
                fullDocument: t,
                // @ts-ignore
                documentKey: t?._id,
                operationType: "delete"
            });
            return cleanDoc;
        });
    }

    async bulk<S>(
        database: DatabaseAdapter,
        operations: (session: S) => Promise<any>
    ): Promise<any> {
        return database.bulk(operations);
    }

    async changes(
        domain: string,
        pipeline: any[],
        database: DatabaseAdapter,
        security: SecurityController,
        listener: (doc: ChangesDocModel) => void,
        options: DatabaseChangesOptions = {bypassDomainVerification: false, resumeToken: undefined}
    ): Promise<{ close: () => void }> {
        if (options && options.bypassDomainVerification === false) {
            await this.handleDomainValidation(domain);
        }
        return database.changes(
            domain,
            pipeline,
            (doc: ChangesModel) => {
                switch (doc.operationType) {
                    case 'create':
                        listener({
                            name: 'create',
                            resumeToken: doc._id,
                            snapshot: this.sanitize4User(
                                doc.fullDocument,
                                [],
                                [],
                                false,
                                security
                            )
                        });
                        return;
                    case 'update':
                        listener({
                            name: 'update',
                            resumeToken: doc._id,
                            snapshot: this.sanitize4User(
                                doc.fullDocument,
                                [],
                                [],
                                false,
                                security
                            )
                        });
                        return;
                    case 'delete':
                        listener({
                            name: 'delete',
                            resumeToken: doc._id,
                            snapshot: this.sanitize4User(
                                doc.fullDocument,
                                [],
                                [],
                                false,
                                security
                            )
                        });
                        return;
                }
            },
            options.resumeToken
        );
    }

    async syncs(
        domain: string,
        database: DatabaseAdapter,
        security: SecurityController,
        // listener: (doc: ChangesDocModel) => void,
        options: BFastDatabaseOptions
    ): Promise<{ close: () => void }> {
        // if (options && options.bypassDomainVerification === false) {
        //     await this.handleDomainValidation(domain);
        // }
        return database.syncs(
            domain,
            // listener,
            options
        );
    }

    async query(
        domain: string,
        queryModel: QueryModel<any>,
        database: DatabaseAdapter,
        security: SecurityController,
        context: ContextBlock,
        options: DatabaseWriteOptions = {bypassDomainVerification: false},
        configs: BFastDatabaseOptions
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
            const result = await database.findOne(domain, queryModel, context, configs);
            return this.sanitize4User(
                result,
                returnFields,
                queryModel?.hashes,
                queryModel.cids,
                security
            );
        } else {
            queryModel = this.sanitizeWithOperator4Db(queryModel as any);
            queryModel.filter = this.sanitizeWithOperator4Db(queryModel?.filter as any);
            queryModel.return = returnFields4Db;
            const result = await database.findMany(domain, queryModel, context, configs);
            if (result && Array.isArray(result)) {
                return result.map(value => this.sanitize4User(
                    value,
                    returnFields,
                    queryModel?.hashes,
                    queryModel.cids,
                    security
                ));
            }
            return result;
        }
    }

    addUpdateMetadata(
        data: any,
        context?: ContextBlock
    ): any {
        if (data && typeof data !== 'boolean') {
            if (data.$set) {
                data.$set.updatedAt = data.$set.updatedAt ? data.$set.updatedAt : new Date();
            } else if (data.$inc) {
                data.$set = {};
                data.$set.updatedAt = new Date();
            }
            return data;
        }
        return data;
    }

    validDomain(domain: string): boolean {
        return (domain !== '_User' && domain !== '_Token' && domain !== '_Policy');
    }

    addCreateMetadata<T extends BasicAttributesModel>(
        data: T,
        security: SecurityController,
        context: ContextBlock
    ): T {
        data.createdBy = context?.uid;
        data.createdAt = data && data.createdAt ? data.createdAt : new Date().toISOString();
        data.updatedAt = data && data.updatedAt ? data.updatedAt : new Date().toISOString();
        if (data._id) {
            return data;
        }
        data._id = data && data.id ? data.id : security.generateUUID();
        delete data.id;
        return data;
    }

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

    sanitizeWithOperator4Db<T extends BasicAttributesModel>(data: T): T {
        data = this.sanitize4Db(data);
        if (data === null || data === undefined) {
            return null;
        }
        // Object.keys(data).forEach(key => {
        //     if (key.startsWith('$')) {
        //         // @ts-ignore
        //         data[key] = this.sanitize4Db(data[key]);
        //     }
        // });
        return data;
    }

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

        if (data && data.hasOwnProperty('_created_at')) {
            data.createdAt = data._created_at;
            delete data._created_at;
        }

        if (data && data.hasOwnProperty('_updated_at')) {
            data.updatedAt = data._updated_at;
            delete data._updated_at;
        }

        if (data && data.hasOwnProperty('_created_by')) {
            data.createdBy = data._created_by;
            delete data._created_by;
        }
        return data;
    }

    sanitize4User<T extends BasicAttributesModel>(
        data: T,
        returnFields: string[],
        hashes: string[],
        onlyCids: boolean,
        security: SecurityController,
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
        if (onlyCids === true) {
            return returnedData;
        }
        const dataHash = security.sha256OfObject(returnedData);
        const exists = hashes.filter(h => h === dataHash);
        if (exists.length === 0) {
            return returnedData;
        } else if (exists.length === 1) {
            return dataHash as any;
        } else {
            return returnedData;
        }
    }

    publishChanges(domain: string, change: ChangesModel) {
        AppEventsFactory.getInstance().pub(ConstUtil.DB_CHANGES_EVENT.concat(domain), change);
    }

}
