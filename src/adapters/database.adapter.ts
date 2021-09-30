import {BasicAttributesModel} from '../model/basic-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {QueryModel} from '../model/query-model';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {DeleteModel} from '../model/delete-model';
import {BFastDatabaseOptions} from "../bfast-database.option";
import {ChangesDocModel} from "../model/changes-doc.model";

export abstract class DatabaseAdapter {

    abstract init(options: BFastDatabaseOptions): Promise<any>;

    abstract writeOne<T extends BasicAttributesModel>(
        domain: string,
        data: T,
        cids: boolean,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any>;

    abstract writeMany<T extends BasicAttributesModel>(
        domain: string,
        data: T[],
        cids: boolean,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any[]>;

    abstract updateOne<T extends BasicAttributesModel, V>(
        domain: string,
        updateModel: UpdateRuleRequestModel,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<V>;

    abstract updateMany<T extends BasicAttributesModel>(
        domain: string,
        updateModel: UpdateRuleRequestModel,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any[]>;

    abstract delete<T extends BasicAttributesModel>(
        domain: string,
        deleteModel: DeleteModel<T>,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<{ _id: string }[]>;

    abstract findOne<T extends BasicAttributesModel>(
        domain: string,
        queryModel: QueryModel<T>,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any>;

    abstract findMany<T extends BasicAttributesModel>(
        domain: string,
        queryModel: QueryModel<T>,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any>;

    abstract changes(domain: string, pipeline: object[], listener: (doc: any) => void, resumeToken: string): Promise<any>;

    abstract syncs(
        domain: string,
        // listener: (doc: ChangesDocModel) => void,
        options: BFastDatabaseOptions): Promise<any>;

    abstract bulk(operations: (session) => Promise<any>): Promise<any>;
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
