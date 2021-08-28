import {
    DatabaseAdapter,
    DatabaseBasicOptions,
    DatabaseUpdateOptions,
    DatabaseWriteOptions
} from '../adapters/database.adapter';
import { Db, FindOneAndUpdateOptions, ModifyResult, MongoClient } from 'mongodb';
import { BasicAttributesModel } from '../model/basic-attributes.model';
import { ContextBlock } from '../model/rules.model';
import { QueryModel } from '../model/query-model';
import { UpdateRuleRequestModel } from '../model/update-rule-request.model';
import { DeleteModel } from '../model/delete-model';
import { BFastDatabaseOptions } from '../bfast-database.option';
import { AppEventsFactory } from "./app-events.factory";
import { ConstUtil } from "../utils/const.util";

const mongoUrlParse = require('mongo-url-parser');

let config: BFastDatabaseOptions;

export class DatabaseFactory implements DatabaseAdapter {

    private static mongoClient;

    constructor(configAdapter: BFastDatabaseOptions) {
        config = configAdapter;
    }

    async writeMany<T extends BasicAttributesModel, V>(domain: string, data: T[], context: ContextBlock, options?: DatabaseWriteOptions)
        : Promise<V> {
        const db = await this.mDb();
        const response = await db
            .collection(domain)
            .insertMany(data as any, {});
        return response.insertedIds as any;
    }

    async writeOne<T extends BasicAttributesModel>(domain: string, data: T, context: ContextBlock, options?: DatabaseWriteOptions)
        : Promise<any> {
        const db = await this.mDb();
        const response = await db.collection(domain).insertOne(data as any, {});
        return response.insertedId;
    }

    private async mDb(): Promise<Db> {
        if (!DatabaseFactory.mongoClient) {
            DatabaseFactory.mongoClient = await new MongoClient(config.mongoDbUri).connect();
            return DatabaseFactory.mongoClient.db();
        }
        return DatabaseFactory.mongoClient.db();
    }

    // private async connection(): Promise<MongoClient> {
    //     let mongoUri;
    //     const parsed = mongoUrlParse(config.mongoDbUri);
    //     if (parsed.auth) {
    //         mongoUri = `mongodb://${parsed.auth.user}:${parsed.auth.password}@2.mongo.fahamutech.com:27017/${parsed.dbName}?authSource=admin`
    //     } else {
    //         mongoUri = `mongodb://localhost:27017/${parsed.dbName}`
    //     }
    //     // console.log(mongoUri);
    //     return new MongoClient(mongoUri).connect();
    // }

    async init(): Promise<any> {
        try {
            await this.dropIndexes('_User');
        } catch (_) {
        }
        return await this.createIndexes('_User', [
            {
                field: 'email',
                unique: true,
                collation: {
                    locale: 'en',
                    strength: 2
                }
            },
            {
                field: 'username',
                unique: true,
                collation: {
                    locale: 'en',
                    strength: 2
                }
            }
        ]);
    }

    async createIndexes(domain: string, indexes: any[]): Promise<any> {
        if (indexes && Array.isArray(indexes)) {
            const db = await this.mDb();
            for (const value of indexes) {
                const indexOptions: any = {};
                Object.assign(indexOptions, value);
                delete indexOptions.field;
                await db.collection(domain).createIndex({ [value.field]: 1 }, indexOptions);
            }
            return 'Indexes added';
        } else {
            throw new Error('Must supply array of indexes to be added');
        }
    }

    async dropIndexes(domain: string): Promise<boolean> {
        const db = await this.mDb();
        await db.collection(domain).dropIndexes();
        return true;
    }

    async listIndexes(domain: string): Promise<any[]> {
        const db = await this.mDb();
        const indexes = await db.collection(domain).listIndexes().toArray();
        return indexes;
    }

    async findOne<T extends BasicAttributesModel>(
        domain: string, queryModel: QueryModel<T>,
        context: ContextBlock, options?: DatabaseWriteOptions): Promise<any> {
        const db = await this.mDb();
        const fieldsToReturn = {
            '_created_at': 1,
            '_updated_at': 1,
        };
        if (queryModel?.return && Array.isArray(queryModel?.return) && queryModel.return.length > 0) {
            queryModel.return.forEach(x => {
                fieldsToReturn[x] = 1;
            });
        }
        const result = await db.collection(domain).findOne(
            { _id: queryModel._id },
            {

                // projection: fieldsToReturn
            }
        );
        return result;
    }

    async query<T extends BasicAttributesModel>(domain: string, queryModel: QueryModel<T>,
        context: ContextBlock, options?: DatabaseWriteOptions): Promise<any> {
        const db = await this.mDb();
        const query = db.collection(domain).find(queryModel.filter, {

            // allowDiskUse: true
        });
        // query.allowDiskUse();
        if (queryModel.skip) {
            query.skip(queryModel.skip);
        } else {
            query.skip(0);
        }
        if (queryModel.size && queryModel.size !== -1 && queryModel.size !== 100) {
            query.limit(queryModel.size);
            console.log(queryModel.size);
        } else if (!queryModel.count) {
            query.limit(50);
        }
        if (queryModel.orderBy && Array.isArray(queryModel.orderBy) && queryModel.orderBy?.length > 0) {
            queryModel.orderBy.forEach(value => {
                query.sort(value);
            });
        }
        if (queryModel.return && Array.isArray(queryModel.return) && queryModel.return.length > 0) {
            const fieldsToReturn = {
                '_created_at': 1,
                '_updated_at': 1,
            };
            queryModel.return.forEach(x => {
                fieldsToReturn[x] = 1;
            });
            // query.project(fieldsToReturn);
        }
        let result;
        // quwquery.();
        if (queryModel?.count === true) {
            result = await query.count();
        } else {
            result = await query.toArray();
        }
        return result;
    }

    async update<T extends BasicAttributesModel, V>(domain: string, updateModel: UpdateRuleRequestModel,
        context: ContextBlock, options?: DatabaseUpdateOptions): Promise<V> {
        const db = await this.mDb();
        let updateOptions: FindOneAndUpdateOptions = {
            upsert: typeof updateModel.upsert === 'boolean' ? updateModel.upsert : false,
            // @ts-ignore
            returnOriginal: false,
            // new: true,
            returnDocument: 'after',

        };
        updateOptions = Object.assign(updateOptions, options && options.dbOptions ? options.dbOptions : {});
        const response: ModifyResult<any> = await db.collection(domain)
            .findOneAndUpdate(
                updateModel.filter,
                updateModel.update,
                updateOptions
            );
        if (response.ok === 1) {
            return response.value as any;
        } else {
            throw "Failt to updae";
        }
    }

    async deleteOne<T extends BasicAttributesModel, V>(domain: string, deleteModel: DeleteModel<T>,
        context: ContextBlock, options?: DatabaseBasicOptions): Promise<V> {
        const db = await this.mDb();
        const response = await db.collection(domain).findOneAndDelete(deleteModel.filter, {});
        return response.value as any;
    }

    async transaction<V>(operations: (session: any) => Promise<any>): Promise<any> {
        return await operations(null);
    }

    async aggregate(domain: string, pipelines: any[], context: ContextBlock, options?: DatabaseWriteOptions): Promise<any> {
        const db = await this.mDb();
        const aggOps = {
            allowDiskUse: true,

        };
        const result = await db.collection(domain).aggregate(pipelines, aggOps).toArray();
        return result;
    }

    async changes(
        domain: string, pipeline: any[],
        listener: (doc: any) => void, resumeToken = undefined
    ): Promise<{ close: () => void }> {
        const appEventInst = AppEventsFactory.getInstance();
        appEventInst.sub(ConstUtil.DB_CHANGES_EVENT.concat(domain), listener);
        return {
            close: () => {
                appEventInst.unSub(ConstUtil.DB_CHANGES_EVENT.concat(domain), listener);
            }
        }
    }
}
