import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn,
    InitDatabaseFn,
    PurgeNodeFn,
    UpsertDataFn,
    UpsertNodeFn
} from '../adapters/database.adapter';
import {MongoClient} from 'mongodb';
import {BFastOptions} from '../bfast-database.option';
import {Node} from "../models/node";
import {Data} from "../models/data";

async function withMongoClient(fn: (conn: MongoClient) => Promise<any>, options: BFastOptions) {
    const conn = await MongoClient.connect(options.databaseURI);
    try {
        return await fn(conn);
    } finally {
        conn.close().catch(reason => {
            console.log(reason, 'close connection FAIL *******');
        });
    }
}

export const upsertDataInStore: UpsertDataFn = async (table: string, data: Data, options: BFastOptions) => {
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

async function purgeNodeValue(table, id, conn: MongoClient) {
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
}

export const purgeNode: PurgeNodeFn = (table, query, options) => {
    return withMongoClient(async conn => {
        if (query && query.id && typeof query.id == "string") {
            await conn.db().collection(table).deleteOne({_id: query.id});
            return {_id: query.id};
        }
        if (query && query.value && typeof query.value === "string") {
            return purgeNodeValue(table, query.value, conn);
        }
    }, options);
}

export const upsertNode: UpsertNodeFn = async (path, node, options) => {
    // console.log(node,'upsert node')
    const set = {};
    if (node && node.value && typeof node.value === "object"){
        set[`value.${Object.keys(node.value)[0]}`] = Object.values(node.value)[0];
    }
    if (node && node.value && typeof node.value === "string"){
        set['value'] = node.value;
    }
    return withMongoClient(async conn => {
        await conn.db().collection(path).updateOne({
            _id: node._id,
        }, {
            $set: set
        }, {
            upsert: true,
        });
        return node;
    }, options);
}

export const getNode: GetNodeFn = async (path, id, options) => {
    return withMongoClient(conn => {
        // console.log(path, 'node path');
        return conn.db().collection(path).findOne(
            {_id: id}
        );
    }, options);
}

export const getNodes: GetNodesFn = (path, nodePage, options): Promise<Node[]> => {
    return withMongoClient(async conn => {
        let cursor = conn.db().collection(path).find<Node>({});
        if (nodePage === null || nodePage === undefined) {
            return cursor.toArray();
        }
        if (nodePage.hasOwnProperty('sort')) {
            cursor = cursor.sort('_id', nodePage.sort);
        }
        if (nodePage.hasOwnProperty('limit')) {
            cursor = cursor.limit(nodePage.limit);
        }
        if (nodePage.hasOwnProperty('skip')) {
            cursor = cursor.skip(nodePage.skip);
        }
        return cursor.toArray();
    }, options);
}

// export const purgeDataInStore: PurgeDataFn = (table, id, options) => {
//     return withMongoClient(async conn => {
//         await conn.db().collection(table).deleteOne({_id: id});
//         return {_id: id};
//     }, options);
// }

export const initDatabase: InitDatabaseFn = async (options) => {
    return 'Done';
}
