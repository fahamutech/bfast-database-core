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

// export const createManyDataInStore: CreateManyDataFn = async (table: string, datas: Array<Data>, options: BFastOptions) => {
//     return withMongoClient(async conn => {
//         await conn.db().collection(table).insertMany(datas as any);
//         return datas;
//     }, options);
// }

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
        // console.log(updateModel);
        // console.log(filter);
        const d = await conn.db().collection(table).findOneAndUpdate(
            filter,
            updateModel.update,
            {
                upsert: !!updateModel.upsert,
                returnDocument: "after"
            }
        );
        // console.log(d);
        return d.value;
    }, options);
}

// export const updateManyDataInStore: UpdateManyDataFn = async (table: string, query: Data, data: UpdateData, options: BFastOptions) => {
//     return withMongoClient(async conn => {
//         await conn.db().collection(table).updateMany(
//             query,
//             {
//                 $set: data?.set ? data.set : {},
//                 $inc: data?.inc ? data.inc : {}
//             },
//             {
//                 upsert: true,
//             }
//         );
//         return data;
//     }, options);
// }

export const getDataInStore: GetDataFn = (table, id, options) => {
    return withMongoClient(conn => {
        return conn.db().collection(table).findOne({_id: id});
    }, options);
}

export const getManyDataInStore: FindDataFn = (table, query, options) => {
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

// async function purgeNodeValue(table, id, conn: MongoClient) {
//     await conn.db().collection(table).updateOne({
//         [`value.${id}`]: {
//             $exists: true
//         }
//     }, {
//         $unset: {
//             [`value.${id}`]: 1
//         }
//     });
//     return {_id: id};
// }

// export const purgeNode: PurgeNodeFn = (table, query, options) => {
//     return withMongoClient(async conn => {
//         if (query && query.id && typeof query.id == "string") {
//             await conn.db().collection(table).deleteOne({_id: query.id});
//             return {_id: query.id};
//         }
//         if (query && query.value && typeof query.value === "string") {
//             return purgeNodeValue(table, query.value, conn);
//         }
//     }, options);
// }
//
// export const upsertNode: UpsertNodeFn = async (path, node, options) => {
//     // console.log(node,'upsert node')
//     const set = {};
//     if (node && node.value && typeof node.value === "object") {
//         set[`value.${Object.keys(node.value)[0]}`] = Object.values(node.value)[0];
//     }
//     if (node && node.value && typeof node.value === "string") {
//         set['value'] = node.value;
//     }
//     return withMongoClient(async conn => {
//         await conn.db().collection(path).updateOne({
//             _id: node._id,
//         }, {
//             $set: set
//         }, {
//             upsert: true,
//         });
//         return node;
//     }, options);
// }
//
// export const getNode: GetNodeFn = async (path, id, options) => {
//     return withMongoClient(conn => {
//         // console.log(path, 'node path');
//         return conn.db().collection(path).findOne(
//             {_id: id}
//         );
//     }, options);
// }
//
// export const getNodes: GetNodesFn = (path, nodePage, options): Promise<Node[]> => {
//     return withMongoClient(async conn => {
//         let cursor = conn.db().collection(path).find<Node>({});
//         if (nodePage === null || nodePage === undefined) {
//             return cursor.toArray();
//         }
//         if (nodePage.hasOwnProperty('sort')) {
//             cursor = cursor.sort('_id', nodePage.sort);
//         }
//         if (nodePage.hasOwnProperty('limit')) {
//             cursor = cursor.limit(nodePage.limit);
//         }
//         if (nodePage.hasOwnProperty('skip')) {
//             cursor = cursor.skip(nodePage.skip);
//         }
//         return cursor.toArray();
//     }, options);
// }

// export const purgeDataInStore: PurgeDataFn = (table, id, options) => {
//     return withMongoClient(async conn => {
//         await conn.db().collection(table).deleteOne({_id: id});
//         return {_id: id};
//     }, options);
// }

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
