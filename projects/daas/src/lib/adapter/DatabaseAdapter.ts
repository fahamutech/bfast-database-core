import {BasicAttributesModel} from "../model/BasicAttributesModel";
import {ContextBlock} from "../model/Rules";
import {QueryModel} from "../model/QueryModel";
import {UpdateRuleRequest} from "../model/UpdateRuleRequest";
import {DeleteModel} from "../model/DeleteModel";

export interface DatabaseAdapter {

    /**
     * initialize some database pre operation like indexes
     */
    init(): Promise<any>;

    /**
     * return promise which resolve to string which is id of a created document
     * @param domain {string} a domain/table/collection to work with
     * @param data {Object} a map of the data to write to bfast::database
     * @param context {ContextBlock} current operation context
     * @param options {DatabaseWriteOptions} bfast::database write operation
     * @return Promise resolve with an id of the record created in bfast::database
     */
    writeOne<T extends BasicAttributesModel>(domain: string, data: T, context: ContextBlock, options?: DatabaseWriteOptions): Promise<any>;

    /**
     * return promise which resolve to object of ids of a created documents
     * @param domain
     * @param data
     * @param context
     * @param options
     */
    writeMany<T extends BasicAttributesModel, V>(domain: string, data: T[], context: ContextBlock, options?: DatabaseWriteOptions): Promise<V>;

    update<T extends BasicAttributesModel, V>(domain: string, updateModel: UpdateRuleRequest, context: ContextBlock, options?: DatabaseUpdateOptions): Promise<V>;

    deleteOne<T extends BasicAttributesModel, V>(domain: string, deleteModel: DeleteModel<T>, context: ContextBlock, options?: DatabaseBasicOptions): Promise<V>;

    /**
     * find a single record from a bfast::database
     * @param domain {string} a domain/table/collection to work with
     * @param queryModel {QueryModel}  a map which represent a desired data to return
     * @param context {ContextBlock} current operation context
     * @param options {DatabaseWriteOptions} bfast::database write operation
     */
    findOne<T extends BasicAttributesModel>(domain: string, queryModel: QueryModel<T>, context: ContextBlock, options?: DatabaseWriteOptions): Promise<any>;

    /**
     * Query a database to find a result depend on the queryModel supplied
     * @param domain {string} a domain/table/collection to work with
     * @param queryModel {QueryModel} a map which represent a required data from bfast::database
     * @param context {ContextBlock} current operation context
     * @param options {DatabaseWriteOptions} bfast::database write options
     */
    query<T extends BasicAttributesModel>(domain: string, queryModel: QueryModel<T>, context: ContextBlock, options?: DatabaseWriteOptions): Promise<any>;

    changes(domain: string, pipeline: Object[], listener: (doc: any) => void): Promise<any>;

    transaction(operations: (session) => Promise<any>): Promise<any>;

    createIndexes(domain: string, indexes: any[]): Promise<any>;

    dropIndexes(domain: string): Promise<boolean>;

    listIndexes(domain: string): Promise<any>;

    aggregate(domain: string, pipelines: Object[], context: ContextBlock, options?: DatabaseWriteOptions): Promise<any[]>;
}

export interface DatabaseWriteOptions extends DatabaseBasicOptions {
    indexes?: {
        field?: string,
        unique?: boolean,
        collation?: { locale: string, strength: number },
        expireAfterSeconds?: number;
    }[];
}

export interface DatabaseUpdateOptions extends DatabaseBasicOptions {
    indexes?: {
        field?: string;
        unique?: boolean;
        collation?: { locale: string, strength: number };
        expireAfterSeconds?: number;
    }[];
}

export interface DatabaseBasicOptions {
    bypassDomainVerification: boolean;
    transaction?: any;
}
