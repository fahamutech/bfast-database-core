import {
    DatabaseAdapter,
    DatabaseBasicOptions,
    DatabaseUpdateOptions,
    DatabaseWriteOptions
} from '../adapters/database.adapter';
import {MongoClient} from 'mongodb';
import {BasicAttributesModel} from '../model/basic-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {QueryModel} from '../model/query-model';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {DeleteModel} from '../model/delete-model';
import {BFastDatabaseOptions} from '../bfast-database.option';
import {TreeController} from 'bfast-database-tree';
import {File as web3File, Web3Storage,} from 'web3.storage';
import {create, IPFS} from "ipfs-core";
import itToStream from 'it-to-stream';
import {Buffer} from "buffer";
import {v4} from 'uuid';
import {ChangesModel} from "../model/changes.model";
import {ConstUtil} from "../utils/const.util";
import {AppEventsFactory} from "./app-events.factory";

let web3Storage: Web3Storage;
const treeController = new TreeController();

// let ipfs: IPFS;

export class DatabaseFactory implements DatabaseAdapter {

    static ipfs: IPFS

    constructor(private readonly config: BFastDatabaseOptions) {
        // if (_ipfs) {
        //     ipfs = _ipfs;
        // }
        web3Storage = new Web3Storage({
            token: config.web3Token
        });
    }

    async dataCid(
        data: { [k: string]: any },
        buffer: Buffer,
        domain: string
    ): Promise<{ cid: string, size: number }> {
        if (this.config.useLocalIpfs) {
            try {
                if (!DatabaseFactory.ipfs) {
                    DatabaseFactory.ipfs = await create();
                }
                const r = await DatabaseFactory.ipfs.add(buffer, {
                    wrapWithDirectory: false
                });
                return {
                    cid: r.cid.toString(),
                    size: r.size
                }
            } catch (e) {
                console.log(e);
                return null;
            }
        } else {
            try {
                const file = new web3File([buffer], `${domain}_${data._id}`);
                const r = await web3Storage.put(
                    [file],
                    {
                        wrapWithDirectory: false,
                        name: data?._id ? `${domain}_${data?._id}` : undefined,
                    }
                );
                return {
                    cid: r,
                    size: 0
                }
            } catch (e) {
                console.log(e);
                throw e;
            }
        }
    }

    async getDataFromCid(cid: string, options: { json?: boolean, start?: number, end?: number, stream?: boolean } = {
        json: true,
        stream: false,
        start: undefined,
        end: undefined
    }): Promise<object | ReadableStream | Buffer> {
        if (!DatabaseFactory.ipfs) {
            DatabaseFactory.ipfs = await create();
        }
        const results = await DatabaseFactory.ipfs.cat(cid, {
            offset: options && options.json === false && options.start ? options.start : undefined,
            length: options && options.json === false && options.end ? options.end : undefined
        });
        if (options?.json === true) {
            let data = '';
            for await (const chunk of results) {
                data += chunk.toString();
            }
            return JSON.parse(data);
        }
        if (options?.json === false) {
            if (options?.stream === true) {
                return itToStream.readable(results);
            } else {
                let buffer = Buffer.alloc(0);
                for await (const chunk of results) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                return buffer;
            }
        }
        // try {
        //     const data = await web3Storage.get(cid);
        //     if (data.ok && await data.files) {
        //         const file = await bfast.functions('_ignore').request('https://' + cid + '.ipfs.dweb.link').get();
        //         return typeof file === "string" ? JSON.parse(file) : file;
        //     } else {
        //         throw await data.json();
        //     }
        // } catch (e) {
        //     console.log(e);
        //     throw e;
        // }
    }

    private nodeProcess(cid: string, options: DatabaseWriteOptions) {
        return {
            nodeHandler: async ({path, node}) => {
                const keys = Object.keys(node);
                for (const key of keys) {
                    let $setMap = {};
                    if (typeof node[key] === "object") {
                        $setMap = Object.keys(node[key]).reduce((a, b) => {
                            a[`value.${b}`] = node[key][b];
                            return a;
                        }, {});
                    } else {
                        $setMap = {
                            value: node[key]
                        }
                    }
                    const conn = await this.connection();
                    await conn.db()
                        .collection(path.toString().replace('/', '_'))
                        .updateOne({
                                _id: isNaN(Number(key)) ? key.trim() : Number(key),
                            }, {
                                $set: $setMap
                            }, {
                                upsert: true,

                            }
                        );
                }
            },
            nodeIdHandler: async function () {
                return cid.toString();
            }
        }
    }

    private async handleQueryObjectTree(
        mapOfNodesToQuery: { [key: string]: any },
        domain: string,
        queryModel: QueryModel<any>,
        options: DatabaseWriteOptions
    ): Promise<any[] | number> {
        const nodesPathList = Object.keys(mapOfNodesToQuery);
        const conn = await this.connection();
        let cids = [];
        const cidMap = {};
        if (nodesPathList.length === 0) {
            let result = await conn.db().collection(`${domain}__id`).find({}).toArray();
            await conn.close();
            if (result && Array.isArray(result)) {
                if (queryModel?.size && queryModel?.size > 0) {
                    const skip = (queryModel.skip && queryModel.skip >= 1) ? queryModel.skip : 0;
                    result = result.slice(skip, (queryModel.size + skip));
                }
                if (queryModel?.count === true) {
                    return result.length;
                }
                return Promise.all(result.map(x => this.getDataFromCid(x?.value)));
            } else {
                return [];
            }
        }

        for (const nodePath of nodesPathList) {
            const nodeTable = nodePath.replace('/', '_').trim();
            const targetNodeId = mapOfNodesToQuery[nodePath];
            let result;
            if (typeof targetNodeId === "object" && targetNodeId?.hasOwnProperty('$fn')) {
                const cursor = conn.db().collection(nodeTable).find({});
                const docs = [];
                while (await cursor.hasNext()) {
                    const next = await cursor.next();
                    const fn = new Function('it', targetNodeId.$fn);
                    fn(next._id) === true ? docs.push(next) : null
                }
                result = docs.reduce((a, b) => {
                    a.value = Object.assign(a.value, b.value);
                    return a;
                }, {value: {}});
            } else {
                result = await conn.db().collection(nodeTable).findOne({_id: targetNodeId});
            }


            if (result && result.value) {
                if (typeof result.value === "object") {
                    for (const k of Object.keys(result.value)) {
                        const _r1 = await conn.db().collection(`${domain}__id`).findOne({
                            _id: k
                        });
                        if (!_r1) {
                            delete result.value[k];
                            conn.db().collection(nodeTable).updateOne({
                                _id: targetNodeId
                            }, {
                                $unset: {
                                    [`value.${k}`]: 1
                                }
                            }).catch(console.log);
                        }
                    }
                    Object.values(result.value).forEach((v: string) => {
                        cids.push(v);
                        if (cidMap[v]) {
                            cidMap[v] += 1;
                        } else {
                            cidMap[v] = 1;
                        }
                    });
                } else if (typeof result.value === 'string') {
                    const _r1 = await conn.db().collection(`${domain}__id`).findOne({
                        _id: result._id
                    });
                    if (!_r1) {
                        result.value = null;
                        conn.db().collection(nodeTable).updateOne({
                            _id: targetNodeId
                        }, {
                            $unset: {
                                value: 1
                            }
                        }).catch(console.log);
                    } else {
                        cids.push(result.value);
                        if (cidMap[result.value]) {
                            cidMap[result.value] += 1;
                        } else {
                            cidMap[result.value] = 1;
                        }
                    }
                }
            }
        }
        await conn.close();
        cids = cids
            .filter(x => cidMap[x] === nodesPathList.length)
            .reduce((a, b) => a.add(b), new Set());
        cids = Array.from(cids);
        if (queryModel?.size && queryModel?.size > 0) {
            const skip = (queryModel.skip && queryModel.skip >= 0) ? queryModel.skip : 0;
            cids = cids.slice(skip, (queryModel.size + skip));
        }
        if (queryModel?.count === true) {
            return cids.length;
        }
        return Promise.all(cids.map(async x => await this.getDataFromCid(x as string)));
    }

    private async handleDeleteObjectTree(
        deleteTree: { [key: string]: any },
        domain: string,
        options: DatabaseWriteOptions
    ): Promise<{ _id: string }[]> {
        const keys = Object.keys(deleteTree);
        const conn = await this.connection();
        let cids = [];
        const cidMap = {};
        if (keys.length === 0) {
            return [];
        }
        for (const key of keys) {
            const nodeTable = key.replace('/', '_').trim();
            const id = deleteTree[key];
            let result;
            if (typeof id === "function") {
                const cursor = conn.db().collection(nodeTable).find({}, {});
                const docs = [];
                while (await cursor.hasNext()) {
                    const next = await cursor.next();
                    id(next._id) === true ? docs.push(next) : null
                }
                result = docs.reduce((a, b) => {
                    a.value = Object.assign(a.value, typeof b.value === "string" ? {[b._id]: b.value} : b.value);
                    a._id.push(b._id);
                    return a;
                }, {value: {}, _id: []});
            } else {
                result = await conn.db().collection(nodeTable).findOne({_id: id}, {});
            }
            if (result && result.value) {
                // console.log(result, '------> result');
                if (typeof result.value === "object") {
                    for (const k of Object.keys(result.value)) {
                        const existInId = await conn.db().collection(`${domain}__id`).findOne({
                            _id: k
                        });
                        // console.log(existInId,'-----> check if exist in _id node');
                        if (!existInId) {
                            delete result.value[k];
                        }
                    }
                    const r11 = await conn.db().collection(`${domain}__id`).deleteMany({
                        _id: {
                            $in: Object.keys(result.value)
                        }
                    }, {});
                    // console.log(r11, '-----> in ids node');
                    const r21 = await conn.db().collection(nodeTable).deleteMany({
                        _id: {
                            $in: Array.isArray(result._id) ? result._id : [result._id]
                        }
                    }, {});
                    // console.log(r21, '---------> in node mode');
                    Object.keys(result.value).forEach((v: string) => {
                        cids.push(v);
                        if (cidMap[v]) {
                            cidMap[v] += 1;
                        } else {
                            cidMap[v] = 1;
                        }
                    });
                } else if (typeof result.value === 'string') {
                    // console.log(result);
                    const r11 = await conn.db().collection(`${domain}__id`).deleteOne({
                        _id: result._id
                    }, {});
                    // console.log(nodeTable);
                    // console.log(r11, '-----> in ids node with string id');
                    const r21 = await conn.db().collection(nodeTable).deleteMany({
                        _id: id
                    });
                    // console.log(r21, '---------> in node mode with string id');
                    cids.push(result._id);
                    if (cidMap[result._id]) {
                        cidMap[result._id] += 1;
                    } else {
                        cidMap[result._id] = 1;
                    }
                }
            }
        }
        await conn.close();
        // console.log(cids);
        cids = cids
            // .filter(x => cidMap[x] === keys.length)
            .reduce((a, b) => a.add(b), new Set());
        return Array.from(cids).map(x => {
            return {
                _id: x
            };
        });
    }

    async writeMany<T extends BasicAttributesModel>(
        domain: string,
        data: T[],
        context: ContextBlock,
        options?: DatabaseWriteOptions
    ): Promise<any[]> {
        for (const _data of data) {
            const buffer = Buffer.from(JSON.stringify({..._data}));
            const {cid} = await this.dataCid({..._data}, buffer, domain);
            await treeController.objectToTree({..._data}, domain, this.nodeProcess(cid.toString(), options));
        }
        return data;
    }

    async writeOne<T extends BasicAttributesModel>(
        domain: string,
        data: T,
        context: ContextBlock,
        options?: DatabaseWriteOptions
    ): Promise<any> {
        const buffer = Buffer.from(JSON.stringify(data));
        const {cid} = await this.dataCid(data, buffer, domain);
        await treeController.objectToTree({...data}, domain, this.nodeProcess(cid.toString(), options));
        return data;
    }

    private async connection(): Promise<MongoClient> {
        const mongoUri = this.config.mongoDbUri.replace('replicaSet=mdbRepl', '');
        return new MongoClient(mongoUri).connect();
    }

    async init(): Promise<any> {
        // try {
        //     await this.dropIndexes('_User');
        // } catch (_) {
        // }
        // return await this.createIndexes('_User', [
        //     {
        //         field: 'email',
        //         unique: true,
        //         collation: {
        //             locale: 'en',
        //             strength: 2
        //         }
        //     },
        //     {
        //         field: 'username',
        //         unique: true,
        //         collation: {
        //             locale: 'en',
        //             strength: 2
        //         }
        //     }
        // ]);
    }

    // async createIndexes(domain: string, indexes: any[]): Promise<any> {
    //     if (indexes && Array.isArray(indexes)) {
    //         const conn = await this.connection();
    //         for (const value of indexes) {
    //             const indexOptions: any = {};
    //             Object.assign(indexOptions, value);
    //             delete indexOptions.field;
    //             await conn.db().collection(domain).createIndex({[value.field]: 1}, indexOptions);
    //         }
    //         await conn.close(); // .catch(console.warn);
    //         return 'Indexes added';
    //     } else {
    //         throw new Error('Must supply array of indexes to be added');
    //     }
    // }
    //
    // async dropIndexes(domain: string): Promise<boolean> {
    //     const conn = await this.connection();
    //     await conn.db().collection(domain).dropIndexes();
    //     await conn.close();
    //     return true;
    // }
    //
    // async listIndexes(domain: string): Promise<any[]> {
    //     const conn = await this.connection();
    //     const indexes = await conn.db().collection(domain).listIndexes().toArray();
    //     await conn.close();
    //     return indexes;
    // }

    async findOne<T extends BasicAttributesModel>(
        domain: string,
        queryModel: QueryModel<T>,
        context: ContextBlock,
        options?: DatabaseWriteOptions
    ): Promise<any> {
        const queryTree = await treeController.query(domain, {
            _id: queryModel._id
        });
        const table = Object.keys(queryTree)[0].replace('/', '_').trim();
        const id = Object.values(queryTree)[0];
        const conn = await this.connection();
        const result = await conn.db().collection(table).findOne(
            {_id: id},
            {}
        );
        await conn.close();
        if (!result) {
            return null;
        }
        const cid = result.value;
        return await this.getDataFromCid(cid);
    }

    async findMany<T extends BasicAttributesModel>(
        domain: string,
        queryModel: QueryModel<T>,
        context: ContextBlock,
        options?: DatabaseWriteOptions
    ): Promise<any> {
        let nodesToQueryData;
        try {
            nodesToQueryData = await treeController.query(domain, queryModel.filter);
        } catch (e) {
            console.log(e);
            return [];
        }
        if (Array.isArray(nodesToQueryData)) {
            const resultMap = {}
            for (const _tree of nodesToQueryData) {
                const r = await this.handleQueryObjectTree(_tree, domain, queryModel, options);
                Array.isArray(r) ?
                    (r.forEach(_r1 => {
                        resultMap[_r1._id] = _r1
                    }))
                    : resultMap[v4()] = r;
            }
            const _result1: any[] = Object.values(resultMap);
            return queryModel?.count ? _result1.reduce((a, b) => a + b, 0) : _result1;
        } else {
            return await this.handleQueryObjectTree(nodesToQueryData, domain, queryModel, options);
        }
    }

    async updateOne<T extends BasicAttributesModel, V>(
        domain: string,
        updateModel: UpdateRuleRequestModel,
        context: ContextBlock, options?: DatabaseUpdateOptions
    ): Promise<any> {
        let oldDoc = await this.findOne(
            domain,
            {
                _id: updateModel.id,
                return: []
            },
            context,
            options
        );
        if (!oldDoc && updateModel.upsert === true) {
            oldDoc = {_id: updateModel.id};
        }
        if (!oldDoc) {
            return null;
        }
        const updateParts = updateModel.update.$set;
        const incrementParts = updateModel.update.$inc;
        let newDoc = Object.assign(oldDoc, updateParts);
        newDoc = this.incrementFields(newDoc, incrementParts);
        return this.writeOne(domain, newDoc, context, options);
    }

    async updateMany<T extends BasicAttributesModel>(
        domain: string,
        updateModel: UpdateRuleRequestModel,
        context: ContextBlock,
        options?: DatabaseUpdateOptions
    ): Promise<any[]> {
        const oldDocs: any[] = await this.findMany(domain, updateModel, context, options);
        if (Array.isArray(oldDocs) && oldDocs.length === 0 && updateModel.upsert === true) {
            let nDoc = Object.assign(updateModel.update.$set, updateModel.filter);
            const incrementParts = updateModel.update.$inc;
            nDoc = this.incrementFields(nDoc, incrementParts);
            oldDocs.push(nDoc);
            return this.writeMany(domain, oldDocs, context, options);
        }
        return Promise.all(oldDocs.map(async x => await this.updateOne(
            domain,
            {
                update: updateModel.update,
                upsert: updateModel.upsert,
                id: x._id,
                return: []
            },
            context,
            options
        )));
    }

    async delete<T extends BasicAttributesModel>(
        domain: string,
        deleteModel: DeleteModel<T>,
        context: ContextBlock, options?: DatabaseBasicOptions
    ): Promise<{ _id: string }[]> {
        let deleteTree;
        try {
            deleteTree = await treeController.query(
                domain,
                deleteModel.id ? {_id: deleteModel.id} : deleteModel.filter
            );
        } catch (e) {
            console.log(e);
            return null;
        }
        if (Array.isArray(deleteTree)) {
            const result = [];
            for (const _tree of deleteTree) {
                const r = await this.handleDeleteObjectTree(_tree, domain, options);
                Array.isArray(r) ? result.push(...r) : result.push(r);
            }
            return result;
        } else {
            return this.handleDeleteObjectTree(deleteTree, domain, options);
        }
    }

    /**
     * need an improvement to have a behaviour like transaction but not transaction
     * @param operations
     */
    async bulk<V>(operations: (session: any) => Promise<any>): Promise<any> {
        // const conn = await this.connection();
        // const session = conn.startSession();
        // try {
        //     await session.withTransaction(async _ => {
        return await operations(null);
        //     }, {
        //         // writeConcern: {
        //         //     w: 'majority'
        //         // }
        //     });
        // } finally {
        //     await session.endSession();
        // }
        // await conn.close();
    }

    async changes(
        domain: string, pipeline: any[],
        listener: (doc: ChangesModel) => void,
        resumeToken = undefined
    ): Promise<{ close: () => void }> {
        const appEventInst = AppEventsFactory.getInstance();
        appEventInst.sub(ConstUtil.DB_CHANGES_EVENT.concat(domain), listener);
        return {
            close: () => {
                appEventInst.unSub(ConstUtil.DB_CHANGES_EVENT.concat(domain), listener);
            }
        }
    }

    private incrementFields(newDoc: any, ip: { [p: string]: any }) {
        if (!newDoc) {
            newDoc = {};
        }
        if (!ip) {
            return newDoc;
        } else {
            for (const key of Object.keys(ip)) {
                if (typeof ip[key] === "number") {
                    if (newDoc.hasOwnProperty(key) && !isNaN(newDoc[key])) {
                        newDoc[key] += ip[key];
                    } else if (!newDoc.hasOwnProperty(key)) {
                        newDoc[key] = ip[key];
                    }
                } else if (typeof ip[key] === "object" && JSON.stringify(ip[key]).startsWith('{')) {
                    newDoc[key] = this.incrementFields(newDoc[key], ip[key]);
                }
            }
            return newDoc;
        }
    }
}
