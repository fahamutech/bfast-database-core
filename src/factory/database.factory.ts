import {
    DatabaseAdapter,
    DatabaseBasicOptions,
    DatabaseUpdateOptions,
    DatabaseWriteOptions
} from '../adapters/database.adapter';
import {ChangeStream, ChangeStreamDocument, FindOneAndUpdateOptions, ModifyResult, MongoClient} from 'mongodb';
import {BasicAttributesModel} from '../model/basic-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {QueryModel} from '../model/query-model';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {DeleteModel} from '../model/delete-model';
import {BFastDatabaseOptions} from '../bfast-database.option';
import {TreeController} from 'bfast-database-tree';
import {Web3Storage} from 'web3.storage';
import {bfast} from "bfastnode";
import {create, IPFS} from "ipfs";
// import {createHash} from "crypto";

let web3Storage: Web3Storage;
const treeController = new TreeController();
bfast.init({applicationId: '', projectId: ''}, '_ignore');
let ipfs: IPFS;

export class DatabaseFactory implements DatabaseAdapter {

    constructor(private readonly config: BFastDatabaseOptions, _ipfs = null) {
        if (_ipfs) {
            ipfs = _ipfs;
        }
        web3Storage = new Web3Storage({
            token: config.web3Token
        });
    }

    private async dataCid(data: any, buffer: Buffer, domain: string): Promise<string> {
        try {
            if (!ipfs) {
                ipfs = await create();
            }
            const results = await ipfs.add(JSON.stringify(data));
            return results.cid.toString();
        } catch (e) {
            console.log(e);
            return null;
        }
        // try {
        //     return web3Storage.put(
        //         [
        //             new File([buffer], `${domain}_${data._id}.json`)
        //         ],
        //         {
        //             wrapWithDirectory: false,
        //             name: `${domain}_${data._id}.json`
        //         }
        //     );
        // } catch (e) {
        //     console.log(e);
        //     throw e;
        // }
    }

    private async getDataFromCid(cid: string): Promise<any> {
        try {
            if (!ipfs) {
                ipfs = await create();
            }
            const results = await ipfs.cat(cid);
            let data = ''
            for await (const chunk of results) {
                data += chunk.toString();
            }
            return JSON.parse(data);
        } catch (e) {
            console.log(e);
            return null;
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

    private nodeProcess(cid: string, options) {
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
                    await conn
                        .db()
                        .collection(path.toString().replace('/', '_'))
                        .updateOne({
                                _id: isNaN(Number(key)) ? key.trim() : Number(key),
                            }, {
                                $set: $setMap
                            }, {
                                upsert: true,
                                session: options && options.transaction ? options.transaction : undefined
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
        queryTree: { [key: string]: any },
        domain: string,
        queryModel: QueryModel<any>
    ): Promise<any[] | number> {
        const keys = Object.keys(queryTree);
        const conn = await this.connection();
        let cids = [];
        const cidMap = {};
        if (keys.length === 0) {
            const result = await conn.db().collection(`${domain}__id`).find({}).toArray();
            await conn.close();
            if (result && Array.isArray(result)) {
                return Promise.all(result.map(x => this.getDataFromCid(x?.value)));
            } else {
                return [];
            }
        }
        for (const key of keys) {
            const nodeTable = key.replace('/', '_').trim();
            const id = queryTree[key];
            let result;
            if (typeof id === "function") {
                const cursor = conn.db().collection(nodeTable).find({});
                const docs = [];
                while (await cursor.hasNext()) {
                    const next = await cursor.next();
                    id(next._id) === true ? docs.push(next) : null
                }
                result = docs.reduce((a, b) => {
                    a.value = Object.assign(a.value, b.value);
                    return a;
                }, {value: {}});
            } else {
                result = await conn.db().collection(nodeTable).findOne({_id: id});
            }
            if (result && result.value) {
                if (typeof result.value === "object") {
                    for (const k of Object.keys(result.value)) {
                        const _r1 = await conn.db().collection(`${domain}__id`).findOne({
                            _id: k
                        });
                        if (!_r1) {
                            delete result.value[k];
                            await conn.db().collection(nodeTable).updateOne({
                                _id: id
                            }, {
                                $unset: {
                                    [`value.${k}`]: 1
                                }
                            });
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
                        await conn.db().collection(nodeTable).updateOne({
                            _id: id
                        }, {
                            $unset: {
                                value: 1
                            }
                        });
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
            .filter(x => cidMap[x] === keys.length)
            .reduce((a, b) => a.add(b), new Set());
        cids = Array.from(cids);
        if (queryModel?.count === true) {
            return cids.length;
        }
        return Promise.all(cids.map(async x => await this.getDataFromCid(x as string)));
    }

    private async handleDeleteObjectTree(
        deleteTree: { [key: string]: any },
        domain: string,
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
                const cursor = conn.db().collection(nodeTable).find({});
                const docs = [];
                while (await cursor.hasNext()) {
                    const next = await cursor.next();
                    id(next._id) === true ? docs.push(next) : null
                }
                result = docs.reduce((a, b) => {
                    a.value = Object.assign(a.value, typeof b.value === "string" ? {[b._id]:b.value} : b.value);
                    a._id.push(b._id);
                    return a;
                }, {value: {}, _id: []});
            } else {
                result = await conn.db().collection(nodeTable).findOne({_id: id});
            }
            if (result && result.value) {
                // console.log(result, '------> result');
                if (typeof result.value === "object") {
                    await conn.db().collection(`${domain}__id`).deleteMany({
                        _id: {
                            $in: Object.keys(result.value)
                        }
                    });
                    await conn.db().collection(nodeTable).deleteMany({
                        _id: {
                            $in: Array.isArray(result._id) ? result._id : [result._id]
                        }
                    });
                    Object.keys(result.value).forEach((v: string) => {
                        cids.push(v);
                        if (cidMap[v]) {
                            cidMap[v] += 1;
                        } else {
                            cidMap[v] = 1;
                        }
                    });
                } else if (typeof result.value === 'string') {
                    await conn.db().collection(`${domain}__id`).deleteOne({
                        _id: result._id
                    });
                    await conn.db().collection(nodeTable).deleteMany({
                        _id: id
                    });
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

    async writeMany<T extends BasicAttributesModel, V>(
        domain: string,
        data: T[],
        context: ContextBlock,
        options?: DatabaseWriteOptions
    ): Promise<V> {
        for (const _data of data) {
            const buffer = Buffer.from(JSON.stringify(_data));
            const cid = await this.dataCid(_data, buffer, domain);
            await treeController.objectToTree(_data, domain, this.nodeProcess(cid, options));
        }
        return data.map(d => d._id) as any;
    }

    async writeOne<T extends BasicAttributesModel>(
        domain: string,
        data: T,
        context: ContextBlock,
        options?: DatabaseWriteOptions
    ): Promise<any> {
        const buffer = Buffer.from(JSON.stringify(data));
        const cid = await this.dataCid(data, buffer, domain);
        await treeController.objectToTree(data, domain, this.nodeProcess(cid, options));
        return data._id;
    }

    private async connection(): Promise<MongoClient> {
        const mongoUri = this.config.mongoDbUri;
        return new MongoClient(mongoUri, {
            w: "majority",
            readConcern: {
                level: "majority"
            }
        }).connect();
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
            {
                session: options && options.transaction ? options.transaction : undefined,
            }
        );
        await conn.close();
        if (!result) {
            return null;
        }
        const cid = result.value;
        return await this.getDataFromCid(cid);
    }

    async query<T extends BasicAttributesModel>(
        domain: string, queryModel: QueryModel<T>,
        context: ContextBlock, options?: DatabaseWriteOptions
    ): Promise<any> {
        let queryTree;
        try {
            queryTree = await treeController.query(domain, queryModel.filter);
        } catch (e) {
            console.log(e);
            return [];
        }
        if (Array.isArray(queryTree)) {
            const result = [];
            for (const _tree of queryTree) {
                const r = await this.handleQueryObjectTree(_tree, domain, queryModel);
                Array.isArray(r) ? result.push(...r) : result.push(r);
            }
            return queryModel?.count ? result.reduce((a, b) => a + b, 0) : result;
        } else {
            return this.handleQueryObjectTree(queryTree, domain, queryModel);
        }
    }

    async update<T extends BasicAttributesModel, V>(
        domain: string,
        updateModel: UpdateRuleRequestModel,
        context: ContextBlock, options?: DatabaseUpdateOptions
    ): Promise<V> {
        const conn = await this.connection();
        let updateOptions: FindOneAndUpdateOptions = {
            upsert: typeof updateModel.upsert === 'boolean' ? updateModel.upsert : false,
            returnDocument: 'after',
            session: options && options.transaction ? options.transaction : undefined
        };
        updateOptions = Object.assign(updateOptions, options && options.dbOptions ? options.dbOptions : {});
        const response: ModifyResult<any> = await conn.db()
            .collection(domain)
            .findOneAndUpdate(
                updateModel.filter,
                updateModel.update,
                updateOptions
            );
        await conn.close();
        if (response.ok === 1) {
            return response.value as any;
        } else {
            throw "Fail to update";
        }
    }

    async updateMany<T extends BasicAttributesModel>(
        domain: string,
        updateModel: UpdateRuleRequestModel,
        context: ContextBlock,
        options?: DatabaseUpdateOptions
    ): Promise<string> {
        const conn = await this.connection();
        let updateOptions: FindOneAndUpdateOptions = {
            upsert: typeof updateModel.upsert === 'boolean' ? updateModel.upsert : false,
            session: options && options.transaction ? options.transaction : undefined
        };
        updateOptions = Object.assign(updateOptions, options && options.dbOptions ? options.dbOptions : {});
        const response = await conn.db()
            .collection(domain)
            .updateMany(
                updateModel.filter,
                updateModel.update,
                updateOptions
            );
        await conn.close();
        if ((response.matchedCount + response.modifiedCount + response.upsertedCount) !== 0) {
            return 'done update';
        } else {
            throw 'Fail to update, no match or modification found';
        }
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
                const r = await this.handleDeleteObjectTree(_tree, domain);
                Array.isArray(r) ? result.push(...r) : result.push(r);
            }
            return result;
        } else {
            return this.handleDeleteObjectTree(deleteTree, domain);
        }
    }

    async transaction<V>(operations: (session: any) => Promise<any>): Promise<any> {
        const conn = await this.connection();
        const session = conn.startSession();
        try {
            await session.withTransaction(async _ => {
                return await operations(session);
            }, {
                writeConcern: {
                    w: 'majority'
                }
            });
        } finally {
            await session.endSession();
        }
        await conn.close();
    }

    async aggregate(domain: string, pipelines: any[], context: ContextBlock, options?: DatabaseWriteOptions): Promise<any> {
        const conn = await this.connection();
        const aggOps = {
            allowDiskUse: true,
            session: options && options.transaction ? options.transaction : undefined
        };
        const result = await conn.db().collection(domain).aggregate(pipelines, aggOps).toArray();
        await conn.close();
        return result;
    }

    async changes(
        domain: string, pipeline: any[],
        listener: (doc: ChangeStreamDocument) => void, resumeToken = undefined
    ): Promise<ChangeStream> {
        const conn = await this.connection();
        const options: any = {fullDocument: 'updateLookup'};
        if (resumeToken && resumeToken.toString() !== 'undefined' && resumeToken.toString() !== 'null') {
            options.startAfter = resumeToken;
        }
        return conn.db().collection(domain).watch(pipeline, options).on('change', doc => {
            listener(doc);
        });
    }
}
