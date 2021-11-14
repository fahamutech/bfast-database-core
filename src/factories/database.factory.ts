import {
    AggregateDataFn,
    CreateDataFn,
    FindDataFn,
    GetDataFn,
    InitDatabaseFn,
    PurgeDataFn,
    PurgeManyDataFn,
    UpdateDataFn
} from '../adapters/database.adapter';
import {MongoClient} from 'mongodb';
import {BFastOptions} from '../bfast-database.option';
import {Data} from "../models/data";
import {UpdateModel} from "../models/update-model";
import {TreeController} from "bfast-database-tree";

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
        await conn.db().collection(table).insertOne(data as any);
        return data;
    }, options);
}

export const updateDataInStore: UpdateDataFn = async (table: string, updateModel: UpdateModel, options: BFastOptions) => {
    return withMongoClient(async conn => {
        let filter: any = {};
        if (updateModel && updateModel.filter) {
            filter = updateModel.filter;
        }
        if (updateModel && updateModel.id) {
            filter._id = updateModel.id;
        }
        if (typeof updateModel.update.$inc === "object") {
            let iQ = await new TreeController().query('', updateModel.update.$inc);
            Object.keys(iQ).forEach(x => {
                iQ[x.substr(1, x.length).replace('/', '.')] = iQ[x];
                delete iQ[x];
            });
            updateModel.update.$inc = iQ;
        }
        const d = await conn.db().collection(table).findOneAndUpdate(
            filter,
            updateModel.update,
            {
                upsert: !!updateModel.upsert,
                returnDocument: "after"
            }
        );
        return d.value;
    }, options);
}


export const getDataInStore: GetDataFn = (table, id, options) => {
    return withMongoClient(conn => {
        return conn.db().collection(table).findOne({_id: id});
    }, options);
}

export const getManyDataInStore: FindDataFn = (table, query, options) => {
    // console.log(query.filter);
    return withMongoClient(async conn => {
        const cursor = conn.db().collection(table).find(query.filter);
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

export const purgeDataInStore: PurgeDataFn = (table, id, options) => {
    return withMongoClient(async conn => {
        await conn.db().collection(table).deleteOne({_id: id});
        return {_id: id};
    }, options);
}

export const purgeManyDataInStore: PurgeManyDataFn = (table, query, options) => {
    return withMongoClient(async conn => {
        await conn.db().collection(table).deleteMany(query);
        return 'done';
    }, options);
}

export const initDatabase: InitDatabaseFn = async (options) => {
    // return withMongoClient(async conn => {
    //     await conn.db().collection('_User').dropIndexes();
    //     await conn.db().collection('_User').createIndex({
    //         username: 1
    //     }, {
    //         unique: true,
    //         // collation: {locale: 'en', strength: 2}
    //     });
    //     await conn.db().collection('_User').createIndex({
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
        return conn.db().collection(table).aggregate(pipelines, {allowDiskUse: true}).toArray();
    }, options);
}
