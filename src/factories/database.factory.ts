import {
    AggregateDataFn,
    CreateDataFn, CreateManyDataFn,
    FindDataFn,
    GetDataFn,
    InitDatabaseFn,
    PurgeDataFn,
    PurgeManyDataFn,
    UpdateDataFn, UpdateManyDataFn
} from '../adapters/database.adapter';
import {MongoClient} from 'mongodb';
import {BFastOptions} from '../bfast-option';
import {Data} from "../models/data";
import {UpdateModel} from "../models/update-model";

async function withMongoClient(fn: (conn: MongoClient) => Promise<any>, options: BFastOptions) {
    const conn = await new MongoClient(options.databaseURI).connect();
    try {
        return await fn(conn);
    } finally {
        conn.close().catch(reason => {
            console.log(reason, 'close connection FAIL *******');
        });
    }
}

export const createDataInStore: CreateDataFn = async (table: string, data: Data, options: BFastOptions) => {
    return withMongoClient(async conn => {
        await conn.db(options.projectId).collection(table).insertOne(data as any);
        return data;
    }, options);
}

export const createManyDataInStore: CreateManyDataFn = async (table: string, data: Data[], options: BFastOptions) => {
    return withMongoClient(async conn => {
        await conn.db(options.projectId).collection(table).insertMany(data as any, {
            ordered: false
        });
        return data;
    }, options);
}

export const updateDataInStore: UpdateDataFn = async (table: string, updateModel: UpdateModel, options: BFastOptions) => {
    return withMongoClient(async conn => {
        const a = await conn.db(options.projectId).collection(table).updateMany(
            updateModel.filter,
            updateModel.update,
            {
                upsert: !!updateModel.upsert,
            }
        );
        return {modified: a.modifiedCount+a.upsertedCount}
    }, options);
}

export const updateManyDataInStore: UpdateManyDataFn
    = async (table: string, updateModel: UpdateModel[], options: BFastOptions) => {
    return withMongoClient(async conn => {
        const bulk = conn.db(options.projectId).collection(table).initializeUnorderedBulkOp();
        updateModel.forEach(u => {
            if (u.upsert === true) {
                bulk.find(u.filter).upsert().update(u.update);
            } else {
                bulk.find(u.filter).update(u.update);
            }
        });
        const a = await bulk.execute();
        if (a.isOk() === true) {
            return {modified: a.modifiedCount + a.upsertedCount};
        }
        throw {message: 'bulk write not executed', reason: a.toString()}
    }, options);
}

export const getDataInStore: GetDataFn = (table, id: any, options) => {
    return withMongoClient(async conn => {
        return conn.db(options.projectId).collection(table).findOne({_id: id});
    }, options);
}

export const getManyDataInStore: FindDataFn = (table, query, options) => {
    return withMongoClient(async conn => {
        const cursor = conn.db(options.projectId).collection(table).find(query.filter);
        if (query && !isNaN(query.size)) {
            cursor.limit(query.size);
        }
        if (query && !isNaN(query.skip)) {
            cursor.skip(query.skip);
        }
        if (query && Array.isArray(query.orderBy)) {
            query.orderBy.forEach(o => {
                cursor.sort(Object.keys(o)[0], Object.values(o)[0]);
            });
        }
        if (query && query.count === true) {
            return cursor.count();
        }
        return cursor.toArray();
    }, options);
}

export const purgeDataInStore: PurgeDataFn = (table, id: any, options) => {
    return withMongoClient(async conn => {
        await conn.db(options.projectId).collection(table).deleteOne({_id: id});
        return {_id: id};
    }, options);
}

export const purgeManyDataInStore: PurgeManyDataFn = (table, query: any, options) => {
    return withMongoClient(async conn => {
        await conn.db(options.projectId).collection(table).deleteMany(query);
        return 'done';
    }, options);
}

export const initDatabase: InitDatabaseFn = async (options) => {
    // return withMongoClient(async conn => {
    //     await conn.db(options.projectId).collection('_User').dropIndexes();
    //     await conn.db(options.projectId).collection('_User').createIndex({
    //         username: 1
    //     }, {
    //         unique: true,
    //         // collation: {locale: 'en', strength: 2}
    //     });
    //     await conn.db(options.projectId).collection('_User').createIndex({
    //         email: 1
    //     }, {
    //         unique: true,
    //         // collation: {locale: 'en', strength: 2}
    //     });
    return 'done';
    // }, options);
}

export const aggregate: AggregateDataFn = async (table, pipelines, options) => {
    return withMongoClient(conn => {
        return conn.db(options.projectId).collection(table).aggregate(pipelines, {allowDiskUse: true}).toArray();
    }, options);
}
