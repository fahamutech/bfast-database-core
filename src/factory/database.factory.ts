import {
    DatabaseAdapter,
    DatabaseBasicOptions,
    DatabaseUpdateOptions,
    DatabaseWriteOptions
} from '../adapters/database.adapter';
import {FindOneAndUpdateOptions, ModifyResult, MongoClient} from 'mongodb';
import {BasicAttributesModel} from '../model/basic-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {QueryModel} from '../model/query-model';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {DeleteModel} from '../model/delete-model';
import {BFastDatabaseOptions} from '../bfast-database.option';
import {AppEventsFactory} from "./app-events.factory";
import {ConstUtil} from "../utils/const.util";

let config: BFastDatabaseOptions;

export class DatabaseFactory implements DatabaseAdapter {

    constructor(configAdapter: BFastDatabaseOptions) {
        config = configAdapter;
    }

    async writeMany<T extends BasicAttributesModel, V>(domain: string, data: T[], context: ContextBlock, options?: DatabaseWriteOptions)
        : Promise<V> {
        const conn = await this.connection();
        const response = await conn.db()
            .collection(domain)
            .insertMany(data as any, {});
        conn.close().catch(console.warn);
        return response.insertedIds as any;
    }

    async writeOne<T extends BasicAttributesModel>(domain: string, data: T, context: ContextBlock, options?: DatabaseWriteOptions)
        : Promise<any> {
        const conn = await this.connection();
        const response = await conn.db().collection(domain)
            .insertOne(data as any, {});
        return response.insertedId;
    }

    private async connection(): Promise<MongoClient> {
        const mongoUri = config.mongoDbUri.replace('replicaSet=mdbRepl', '');
        return new MongoClient(mongoUri).connect();
    }

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
            const conn = await this.connection();
            for (const value of indexes) {
                const indexOptions: any = {};
                Object.assign(indexOptions, value);
                delete indexOptions.field;
                await conn.db().collection(domain).createIndex({[value.field]: 1}, indexOptions);
            }
            await conn.close(); // .catch(console.warn);
            return 'Indexes added';
        } else {
            throw new Error('Must supply array of indexes to be added');
        }
    }

    async dropIndexes(domain: string): Promise<boolean> {
        const conn = await this.connection();
        await conn.db().collection(domain).dropIndexes();
        await conn.close();
        return true;
    }

    async listIndexes(domain: string): Promise<any[]> {
        const conn = await this.connection();
        const indexes = await conn.db().collection(domain).listIndexes().toArray();
        await conn.close();
        return indexes;
    }

    async findOne<T extends BasicAttributesModel>(
        domain: string, queryModel: QueryModel<T>,
        context: ContextBlock, options?: DatabaseWriteOptions): Promise<any> {
        const conn = await this.connection();
        const fieldsToReturn = {
            '_created_at': 1,
            '_updated_at': 1,
        };
        if (queryModel?.return && Array.isArray(queryModel?.return) && queryModel.return.length > 0) {
            queryModel.return.forEach(x => {
                fieldsToReturn[x] = 1;
            });
        }
        const result = await conn.db()
            .collection(domain)
            .findOne(
                {_id: queryModel._id},
                {

                    // projection: fieldsToReturn
                }
            );
        await conn.close();
        return result;
    }

    async query<T extends BasicAttributesModel>(domain: string, queryModel: QueryModel<T>,
                                                context: ContextBlock, options?: DatabaseWriteOptions): Promise<any> {
        const conn = await this.connection();
        const query = conn.db().collection(domain).find(queryModel.filter, {

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
        await conn.close();
        return result;
    }

    async update<T extends BasicAttributesModel, V>(domain: string, updateModel: UpdateRuleRequestModel,
                                                    context: ContextBlock, options?: DatabaseUpdateOptions): Promise<V> {
        const conn = await this.connection();
        let updateOptions: FindOneAndUpdateOptions = {
            upsert: typeof updateModel.upsert === 'boolean' ? updateModel.upsert : false,
            // @ts-ignore
            returnOriginal: false,
            // new: true,
            returnDocument: 'after',

        };
        updateOptions = Object.assign(updateOptions, options && options.dbOptions ? options.dbOptions : {});
        // @ts-ignore
        const response: ModifyResult<any> = await conn.db().collection(domain)
            .findOneAndUpdate(
                updateModel.filter,
                updateModel.update,
                updateOptions
            );
        await conn.close();
        if (response.ok === 1) {
            return response.value as any;
        } else {
            throw "Failt to updae";
        }
    }

    async deleteOne<T extends BasicAttributesModel, V>(domain: string, deleteModel: DeleteModel<T>,
                                                       context: ContextBlock, options?: DatabaseBasicOptions): Promise<V> {
        const conn = await this.connection();
        const response = await conn.db()
            .collection(domain)
            .findOneAndDelete(deleteModel.filter, {});
        await conn.close();
        return response.value as any;
    }

    async transaction<V>(operations: (session: any) => Promise<any>): Promise<any> {
        const conn = await this.connection();
        // const session = conn.startSession();
        try {
            // await session.withTransaction(async _ => {
            return await operations(null);
            // }, {
            // readPreference: 'primary',
            // readConcern: {
            //     level: 'local'
            // },
            // readConcern: {
            //     level: '',
            //     toJSON:
            // },
            // writeConcern: {
            //     w: 'majority'
            // }
            // });
        } finally {
            //     await session.endSession();
            await conn.close();
        }
    }

    async aggregate(domain: string, pipelines: any[], context: ContextBlock, options?: DatabaseWriteOptions): Promise<any> {
        const conn = await this.connection();
        const aggOps = {
            allowDiskUse: true,

        };
        const result = await conn.db().collection(domain).aggregate(pipelines, aggOps).toArray();
        await conn.close();
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
