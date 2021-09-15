import {DatabaseAdapter} from '../adapters/database.adapter';
import {Db, MongoClient} from 'mongodb';
import {BasicAttributesModel} from '../model/basic-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {QueryModel} from '../model/query-model';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {DeleteModel} from '../model/delete-model';
import {BFastDatabaseOptions} from '../bfast-database.option';
import {TreeController} from 'bfast-database-tree';
import {Buffer} from "buffer";
import {v4} from 'uuid';
import {ChangesModel} from "../model/changes.model";
import {ConstUtil} from "../utils/const.util";
import {AppEventsFactory} from "./app-events.factory";
import {devLog} from "../utils/debug.util";
import {IpfsFactory} from "./ipfs.factory";

export class DatabaseFactory implements DatabaseAdapter {

    private static mongoClient: MongoClient;
    private readonly ipfsFactory = new IpfsFactory();

    constructor() {
    }

    private whenWantToSaveADataNodeToATree(cid: string, options: BFastDatabaseOptions) {
        return {
            nodeHandler: async ({path, node}) => {
                for (const key of Object.keys(node)) {
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
                    devLog('start save a node', key);
                    const db = await this.mDb(options);
                    await db.collection(DatabaseFactory.nodeTable(path.toString())).updateOne({
                        _id: isNaN(Number(key)) ? key.trim() : Number(key),
                    }, {
                        $set: $setMap
                    }, {
                        upsert: true,
                    });
                    devLog('done save a node', key);
                }
            },
            nodeIdHandler: async function () {
                return cid.toString();
            }
        }
    }

    private async nodeSearchResult(
        nodeTable: string,
        targetNodeId: any,
        db: Db
    ): Promise<{ value: any, _id: string }> {
        if (typeof targetNodeId === "object" && targetNodeId?.hasOwnProperty('$fn')) {
            devLog('handle query by expression', targetNodeId.$fn);
            const cursor = db.collection(nodeTable).find({});
            const docs = [];
            while (await cursor.hasNext()) {
                const next = await cursor.next();
                const fn = new Function('it', targetNodeId.$fn);
                fn(next._id) === true ? docs.push(next) : null
            }
            devLog('query has found items', docs.length);
            return docs.reduce((a, b) => {
                if (typeof b?.value === 'string') {
                    a.value = Object.assign(a.value, {[b._id ? b._id : b.id]: b.value});
                } else {
                    a.value = Object.assign(a.value, b.value);
                }
                return a;
            }, {value: {}});
        } else {
            devLog('handle query by node_id', targetNodeId);
            return await db.collection(nodeTable).findOne({_id: targetNodeId}) as any;
        }
    }

    private async handleQueryObjectTree(
        mapOfNodesToQuery: { [key: string]: any },
        domain: string,
        queryModel: QueryModel<any>,
        options: BFastDatabaseOptions
    ): Promise<any[] | number> {
        const nodesPathList = Object.keys(mapOfNodesToQuery);
        const db = await this.mDb(options);
        if (nodesPathList.length === 0) {
            devLog('try to get all data on this node', `${domain}__id`);
            return this.getAllContentsFromTreeTable(
                db,
                domain,
                queryModel,
                options
            );
        }
        let cids = await this.processTreeSearchResultToCidList(
            mapOfNodesToQuery,
            nodesPathList,
            domain,
            db
        );
        if (queryModel?.size && queryModel?.size > 0) {
            const skip = (queryModel.skip && queryModel.skip >= 0) ? queryModel.skip : 0;
            cids = cids.slice(skip, (queryModel.size + skip));
        }
        if (queryModel?.count === true) {
            return cids.length;
        }
        devLog('total cids to fetch data from', cids.length);
        if (queryModel.cids === true) {
            return cids.filter(c => c !== null);
        }
        const _all_p = cids.map(x => {
            return this.ipfsFactory.generateDataFromCid(x, {
                json: true
            }, options);
        });
        const _all = await Promise.all(_all_p);
        return _all.filter(t => t !== null);
    }

    private static nodeTable(nodePath) {
        return nodePath?.replace(new RegExp('/', 'ig'), '_').trim();
    }

    private static async pruneNode(
        nodeValue: { value: any, _id: string },
        nodeTable: string,
        domain: string,
        db: Db
    ): Promise<{ value: any, _id: string }> {
        for (const k of Object.keys(nodeValue.value)) {
            const _r1 = await db.collection(`${domain}__id`).findOne({
                _id: k
            });
            if (!_r1) {
                delete nodeValue.value[k];
                db.collection(nodeTable).updateOne({
                    [`value.${k}`]: {
                        $exists: true
                    }
                }, {
                    $unset: {
                        [`value.${k}`]: 1
                    }
                }).catch(console.log);
            }
        }
        return nodeValue;
    }

    private static async pruneNodeWithStringValue(
        targetNodeId: string,
        nodeValue: { value: any, _id: string },
        nodeTable: string,
        domain: string,
        db: Db
    ): Promise<any> {
        const _r1 = await db.collection(`${domain}__id`).findOne({
            _id: nodeValue._id
        });
        if (!_r1) {
            nodeValue.value = null;
            db.collection(nodeTable).updateOne({
                _id: targetNodeId
            }, {
                $unset: {
                    value: 1
                }
            }).catch(console.log);
        }
        return nodeValue;
    }

    private async handleDeleteObjectTree(
        deleteTree: { [key: string]: any },
        domain: string,
        options: BFastDatabaseOptions
    ): Promise<{ _id: string }[]> {
        const keys = Object.keys(deleteTree);
        const db = await this.mDb(options);
        let cids = [];
        const cidMap = {};
        if (keys.length === 0) {
            return [];
        }
        for (const key of keys) {
            const nodeTable = DatabaseFactory.nodeTable(key);
            const id = deleteTree[key];
            let result = await this.nodeSearchResult(
                nodeTable,
                id,
                db
            );
            if (result && result.value) {
                if (typeof result.value === "object") {
                    result = await DatabaseFactory.pruneNode(
                        result,
                        nodeTable,
                        domain,
                        db
                    );
                    for (const v of Object.keys(result.value)) {
                        cids.push(v);
                        if (cidMap[v]) {
                            cidMap[v] += 1;
                        } else {
                            cidMap[v] = 1;
                        }
                    }
                } else if (typeof result.value === 'string') {
                    result = await DatabaseFactory.pruneNodeWithStringValue(
                        id,
                        result,
                        nodeTable,
                        domain,
                        db
                    );
                    if (result && result._id) {
                        cids.push(result._id);
                        if (cidMap[result._id]) {
                            cidMap[result._id] += 1;
                        } else {
                            cidMap[result._id] = 1;
                        }
                    }
                }
            }
        }
        cids = cids
            .filter(x => cidMap[x] === keys.length)
            .reduce((a, b) => a.add(b), new Set());
        cids = Array.from(cids);
        for (const x of cids) {
            await db.collection(`${domain}__id`).deleteOne({
                _id: x
            }, {});
        }
        return cids.map(y => {
            return {
                _id: y
            }
        });
    }

    async writeMany<T extends BasicAttributesModel>(
        domain: string,
        data: T[],
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any[]> {
        for (const _data of data) {
            await this.writeOne(
                domain,
                _data,
                context,
                options
            );
        }
        return data;
    }

    async writeOne<T extends BasicAttributesModel>(
        domain: string,
        data: T,
        context: ContextBlock,
        options: BFastDatabaseOptions,
    ): Promise<any> {
        const dataCopy: any = Object.assign({},data);
        const buffer = Buffer.from(JSON.stringify(dataCopy));
        const {cid} = await this.ipfsFactory.generateCidFromData(dataCopy, buffer, domain, options);
        const treeController = new TreeController();
        await treeController.objectToTree(
            dataCopy,
            domain,
            this.whenWantToSaveADataNodeToATree(cid.toString(), options)
        );
        return dataCopy;
    }

    private async mDb(options: BFastDatabaseOptions): Promise<Db> {
        if (!DatabaseFactory.mongoClient) {
            DatabaseFactory.mongoClient = await new MongoClient(options.mongoDbUri).connect();
            return DatabaseFactory.mongoClient.db();
        }
        return DatabaseFactory.mongoClient.db();
    }

    async init(options: BFastDatabaseOptions): Promise<any> {
        await this.ipfsFactory.ensureIpfs(options);
    }

    async findOne<T extends BasicAttributesModel>(
        domain: string,
        queryModel: QueryModel<T>,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any> {
        const treeController = new TreeController();
        const queryTree = await treeController.query(domain, {
            _id: queryModel._id
        });
        const table = DatabaseFactory.nodeTable(Object.keys(queryTree)[0]);
        const id = Object.values(queryTree)[0];
        const db = await this.mDb(options);
        const result = await db.collection(table).findOne(
            {_id: id},
            {}
        );
        if (!result) {
            return null;
        }
        const cid = result.value;
        if (queryModel.cids === true) {
            return cid;
        }
        return this.ipfsFactory.generateDataFromCid(cid, {
            json: true
        }, options);
    }

    async findMany<T extends BasicAttributesModel>(
        domain: string,
        queryModel: QueryModel<T>,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any> {
        let nodesToQueryData;
        try {
            const treeController = new TreeController();
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
        context: ContextBlock,
        options: BFastDatabaseOptions
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
        options: BFastDatabaseOptions
    ): Promise<any[]> {
        const oldDocs: any[] = await this.findMany(domain, updateModel, context, options);
        if (Array.isArray(oldDocs) && oldDocs.length === 0 && updateModel.upsert === true) {
            let nDoc = Object.assign(updateModel.update.$set, updateModel.filter);
            const incrementParts = updateModel.update.$inc;
            nDoc = this.incrementFields(nDoc, incrementParts);
            oldDocs.push(nDoc);
            return this.writeMany(domain, oldDocs, context, options);
        }
        for (const x of oldDocs) {
            oldDocs[oldDocs.indexOf(x)] = await this.updateOne(
                domain,
                {
                    update: updateModel.update,
                    upsert: updateModel.upsert,
                    id: x._id,
                    return: []
                },
                context,
                options
            );
        }
        return oldDocs;
    }

    async delete<T extends BasicAttributesModel>(
        domain: string,
        deleteModel: DeleteModel<T>,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<{ _id: string }[]> {
        let deleteTree;
        try {
            const treeController = new TreeController();
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

    async bulk<V>(operations: (session: any) => Promise<any>): Promise<any> {
        return await operations(null);
    }

    async changes(
        domain: string,
        pipeline: any[],
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

    async getAllContentsFromTreeTable(
        db: Db,
        domain: string,
        queryModel: QueryModel<any>,
        options: BFastDatabaseOptions
    ): Promise<any[] | number> {
        let result = await db.collection(`${domain}__id`).find({}).toArray();
        if (result && Array.isArray(result)) {
            if (queryModel?.size && queryModel?.size > 0) {
                const skip = (queryModel.skip && queryModel.skip >= 1) ? queryModel.skip : 0;
                result = result.slice(skip, (queryModel.size + skip));
            }
            if (queryModel?.count === true) {
                return result.length;
            }
            devLog('total cids to fetch data from', result.length);
            if (queryModel.cids === true) {
                return result.map(x => x?.value).filter(y => y !== null);
            }
            const _all_p = result.map(x => {
                return this.ipfsFactory.generateDataFromCid(x?.value, {
                    json: true
                }, options);
            });
            const _all = await Promise.all(_all_p);
            return _all.filter(b => b !== null);
        } else {
            return [];
        }
    }

    async processTreeSearchResultToCidList(
        mapOfNodesToQuery,
        nodesPathList,
        domain: string,
        db: Db
    ): Promise<string[]> {
        let cids = [];
        const cidMap = {};
        for (const nodePath of nodesPathList) {
            const nodeTable = DatabaseFactory.nodeTable(nodePath);
            const targetNodeId = mapOfNodesToQuery[nodePath];
            let result = await this.nodeSearchResult(
                nodeTable,
                targetNodeId,
                db
            );
            if (result && result.value) {
                if (typeof result.value === "object") {
                    result = await DatabaseFactory.pruneNode(
                        result,
                        nodeTable,
                        domain,
                        db
                    );
                    for (const v of Object.values<string>(result.value)) {
                        cids.push(v);
                        if (cidMap[v]) {
                            cidMap[v] += 1;
                        } else {
                            cidMap[v] = 1;
                        }
                    }
                } else if (typeof result.value === 'string') {
                    result = await DatabaseFactory.pruneNodeWithStringValue(
                        targetNodeId,
                        result,
                        nodeTable,
                        domain,
                        db
                    );
                    if (result && result.value) {
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
        cids = cids.filter(x => cidMap[x] === nodesPathList.length).reduce((a, b) => a.add(b), new Set());
        cids = Array.from(cids);
        return cids;
    }
}
