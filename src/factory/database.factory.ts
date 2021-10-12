import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn, InitDatabaseFn, PurgeDataFn,
    PurgeNodeFn,
    PurgeNodeValueFn,
    UpsertDataFn,
    UpsertNodeFn
} from '../adapters/database.adapter';
import {MongoClient} from 'mongodb';
import {BFastOptions} from '../bfast-database.option';
import {Node} from "../model/node";
import {Data} from "../model/data";
import {Cursor} from "../model/cursor";

async function withMongoClient(fn: (conn: MongoClient) => Promise<any>, options: BFastOptions) {
    const conn = await MongoClient.connect(options.mongoDbUri);
    try {
        return await fn(conn);
    } finally {
        conn.close().catch(reason => {
            console.log(reason, 'close connection FAIL *******');
        });
    }
}

export const upsertDataInStore: UpsertDataFn<any> = async (table: string, data: Data, options: BFastOptions) => {
    return withMongoClient(async conn => {
        await conn.db().collection(table).updateOne(
            {_id: data?._id},
            {$set: data},
            {
                upsert: true,
            }
        );
        return data;
    }, options);
}

export const getDataInStore: GetDataFn = (table, id, options) => {
    return withMongoClient(conn => {
        return conn.db().collection(table).findOne({_id: id});
    }, options);
}

export const purgeNodeValue: PurgeNodeValueFn = (table, id, options) => {
    return withMongoClient(async conn => {
        await conn.db().collection(table).updateOne({
            [`value.${id}`]: {
                $exists: true
            }
        }, {
            $unset: {
                [`value.${id}`]: 1
            }
        });
        return {_id: id};
    }, options);
}

export const upsertNode: UpsertNodeFn<any> = async (path, node, options) => {
    return withMongoClient(async conn => {
        await conn.db().collection(path).updateOne({
            _id: node._id,
        }, {
            $set: node
        }, {
            upsert: true,
        });
        return node;
    }, options);
}

export const getNode: GetNodeFn = async (path, id, options) => {
    return withMongoClient(conn => {
        return conn.db().collection(path).findOne(
            {_id: id}
        );
    }, options);
}

export const getNodes: GetNodesFn<Node> = (path, options): Promise<Cursor<any>> => {
    return withMongoClient(async conn => {
         return conn.db().collection(path).find<Node>({});
    }, options);
}

export const purgeNode: PurgeNodeFn = (table, id, options) => {
    return withMongoClient(async conn => {
        await conn.db().collection(table).deleteOne({_id: id});
        return {_id: id};
    }, options);
}

export const purgeDataInStore: PurgeDataFn = (table, id, options) => {
    return withMongoClient(async conn => {
        await conn.db().collection(table).deleteOne({_id: id});
        return {_id: id};
    }, options);
}

export const initDatabase: InitDatabaseFn = async (options) => {
    return 'Done';
}
