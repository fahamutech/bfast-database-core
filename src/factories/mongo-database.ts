import {MongoClient} from 'mongodb';
import {BFastOptions} from '../bfast-option';
import {Data} from "../models/data";
import {UpdateModel} from "../models/update-model";
import {DatabaseAdapter} from "../adapters/database";

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

export class MongoDatabaseFactory extends DatabaseAdapter {

    async createOneData(table: string, data: Data, options: BFastOptions) {
        return withMongoClient(async conn => {
            await conn.db(options.projectId).collection(table).insertOne(data as any);
            return data;
        }, options);
    }

    async createManyData(table: string, data: Data[], options: BFastOptions) {
        return withMongoClient(async conn => {
            await conn.db(options.projectId).collection(table).insertMany(data as any, {
                ordered: false
            });
            return data;
        }, options);
    }

    async updateOneData(table: string, updateModel: UpdateModel, options: BFastOptions) {
        return withMongoClient(async conn => {
            const a = await conn.db(options.projectId).collection(table).updateMany(
                updateModel.filter,
                updateModel.update,
                {
                    upsert: !!updateModel.upsert,
                }
            );
            return {modified: a.modifiedCount + a.upsertedCount}
        }, options);
    }

    async updateManyData(table: string, updateModel: UpdateModel[], options: BFastOptions) {
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
            throw {message: 'transaction write not executed', reason: a.toString()}
        }, options);
    }

    getOneData(table, id: any, options) {
        return withMongoClient(async conn => {
            return conn.db(options.projectId).collection(table).findOne({_id: id});
        }, options);
    }

    getManyData(table, query, options) {
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
                    cursor.sort(Object.keys(o)[0], Object.values(o)[0] as any);
                });
            }
            if (query && query.count === true) {
                return cursor.count();
            }
            return cursor.toArray();
        }, options);
    }

    removeOneData(table, id: any, options) {
        return withMongoClient(async conn => {
            await conn.db(options.projectId).collection(table).deleteOne({_id: id});
            return {_id: id};
        }, options);
    }

    removeManyData(table, query: any, options) {
        return withMongoClient(async conn => {
            await conn.db(options.projectId).collection(table).deleteMany(query);
            return 'done';
        }, options);
    }

    async init(options) {
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

    async aggregateData(table, pipelines, options) {
        return withMongoClient(conn => {
            return conn.db(options.projectId)
                .collection(table).aggregate(pipelines, {allowDiskUse: true}).toArray();
        }, options);
    }

    session<T>(): Promise<T> {
        return Promise.resolve(undefined);
    }

}



