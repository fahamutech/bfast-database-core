import {BasicAttributesModel} from '../model/basic-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {QueryModel} from '../model/query-model';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {DeleteModel} from '../model/delete-model';

export abstract class DatabaseAdapter {

    /**
     * initialize some database pre operation like indexes
     */
    abstract init(): Promise<any>;

    /**
     * return promise which resolve to string which is id of a created document
     * @param domain - {string} a domain/table/collection to work with
     * @param data - {Object} a map of the data to write to bfast::database
     * @param context - {ContextBlock} current operation context
     * @param options - {DatabaseWriteOptions} bfast::database write operation
     * @return Promise resolve with an id of the record created in bfast::database
     */
    abstract writeOne<T extends BasicAttributesModel>(domain: string, data: T, context: ContextBlock, options?: DatabaseWriteOptions): Promise<any>;

    /**
     * return promise which resolve to object of ids of a created documents
     * @param domain - {string}
     * @param data - {Array<any>}
     * @param context - {ContextBlock}
     * @param options - {Data}
     */
    abstract writeMany<T extends BasicAttributesModel, V>(domain: string, data: T[], context: ContextBlock, options?: DatabaseWriteOptions)
        : Promise<V>;

    abstract update<T extends BasicAttributesModel, V>(domain: string, updateModel: UpdateRuleRequestModel, context: ContextBlock,
                                                       options?: DatabaseUpdateOptions): Promise<V>;

    abstract deleteOne<T extends BasicAttributesModel, V>(domain: string, deleteModel: DeleteModel<T>, context: ContextBlock,
                                                          options?: DatabaseBasicOptions): Promise<V>;

    /**
     * find a single record from a bfast::database
     * @param domain - {string} a domain/table/collection to work with
     * @param queryModel - {QueryModel}  a map which represent a desired data to return
     * @param context - {ContextBlock} current operation context
     * @param options - {DatabaseWriteOptions} bfast::database write operation
     */
    abstract findOne<T extends BasicAttributesModel>(domain: string, queryModel: QueryModel<T>, context: ContextBlock,
                                                     options?: DatabaseWriteOptions): Promise<any>;

    /**
     * Query a database to find a result depend on the queryModel supplied
     * @param domain - {string} a domain/table/collection to work with
     * @param queryModel - {QueryModel} a map which represent a required data from bfast::database
     * @param context - {ContextBlock} current operation context
     * @param options - {DatabaseWriteOptions} bfast::database write options
     */
    abstract query<T extends BasicAttributesModel>(domain: string, queryModel: QueryModel<T>, context: ContextBlock,
                                                   options?: DatabaseWriteOptions): Promise<any>;

    abstract changes(domain: string, pipeline: object[], listener: (doc: any) => void): Promise<any>;

    abstract transaction(operations: (session) => Promise<any>): Promise<any>;

    abstract createIndexes(domain: string, indexes: any[]): Promise<any>;

    abstract dropIndexes(domain: string): Promise<boolean>;

    abstract listIndexes(domain: string): Promise<any>;

    abstract aggregate(domain: string, pipelines: object[], context: ContextBlock, options?: DatabaseWriteOptions): Promise<any[]>;
}

export interface DatabaseWriteOptions extends DatabaseBasicOptions {
    indexes?: {
        field?: string,
        unique?: boolean,
        collation?: { locale: string, strength: number },
        expireAfterSeconds?: number;
    }[];
}

export interface DatabaseChangesOptions extends DatabaseWriteOptions{
    resumeToken?: string;
}

export interface DatabaseUpdateOptions extends DatabaseBasicOptions {
    indexes?: {
        field?: string;
        unique?: boolean;
        collation?: { locale: string, strength: number };
        expireAfterSeconds?: number;
    }[];
    dbOptions?: { [key: string]: any }
}

export interface DatabaseBasicOptions {
    bypassDomainVerification: boolean;
    transaction?: any;
}
