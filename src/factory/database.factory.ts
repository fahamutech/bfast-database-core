import {DatabaseAdapter} from '../adapters/database.adapter';
import {MongoClient} from 'mongodb';
import {BasicAttributesModel} from '../model/basic-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {QueryModel} from '../model/query-model';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {DeleteModel} from '../model/delete-model';
import {BFastDatabaseOptions} from '../bfast-database.option';
import {TreeController} from 'bfast-database-tree';
import {v4} from 'uuid';
import {ChangesModel} from "../model/changes.model";
import {ConstUtil} from "../utils/const.util";
import {AppEventsFactory} from "./app-events.factory";
import {devLog} from "../utils/debug.util";
import * as Y from 'yjs'
import {YMapEvent} from 'yjs'
import {WebrtcProvider} from 'y-webrtc'
import {WebsocketProvider} from "y-websocket";
import {createHash} from "crypto";
import {ChangesDocModel} from "../model/changes-doc.model";
import {Node} from "../model/node";
import {IdNode} from "../model/id-node";

export class DatabaseFactory implements DatabaseAdapter {
    private static instance: DatabaseFactory;

    private constructor() {
    }

    static getInstance() {
        if (!DatabaseFactory.instance) {
            DatabaseFactory.instance = new DatabaseFactory();
        }
        return DatabaseFactory.instance;
    }

    private whenWantToSaveADataNodeToATree(cid: string, conn: MongoClient) {
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
                    await conn.db().collection(DatabaseFactory.hashOfNodePath(path)).updateOne({
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

    async withMongoClient(fn: (conn: MongoClient) => Promise<any>, options: BFastDatabaseOptions) {
        const conn = await MongoClient.connect(options.mongoDbUri);
        try {
            return await fn(conn);
        } finally {
            conn.close()
                // .then(value => {
                //     console.log(value, 'close connection OK ******');
                // })
                .catch(reason => {
                    console.log(reason, 'close connection FAIL *******');
                });
        }
    }

    private async nodeSearchResult(
        nodePath: string,
        nodeId: any,
        conn: MongoClient
    ): Promise<Node> {
        if (typeof nodeId === "object" && nodeId?.hasOwnProperty('$fn')) {
            devLog('handle query by expression', nodeId.$fn);
            // const conn = await this.connection(options);
            let cursor = conn.db().collection(DatabaseFactory.hashOfNodePath(nodePath)).find<Node | IdNode>({});
            if (nodeId.hasOwnProperty('$orderBy')) {
                cursor = cursor.sort('_id', nodeId.$orderBy);
            }
            if (nodeId.hasOwnProperty('$limit')) {
                cursor = cursor.limit(nodeId.$limit);
            }
            if (nodeId.hasOwnProperty('$skip')) {
                cursor = cursor.skip(nodeId.$skip);
            }
            const docs: any[] = [];
            while (await cursor.hasNext()) {
                const next: Node | IdNode = await cursor.next();
                const fn = new Function('it', nodeId.$fn);
                fn(next._id) === true ? docs.push(next) : null
            }
            devLog('query has found items', docs.length);
            return docs.reduce<Node>((a, b: Node | IdNode) => {
                if (typeof b.value === 'string') {
                    a.value = Object.assign(a.value, {[b._id]: b.value});
                } else {
                    a.value = Object.assign(a.value, b.value);
                }
                a._ids.push(b._id);
                return a;
            }, {value: {}, _id: null, _ids: []});
        } else {
            // const conn = await this.connection(options)
            devLog('handle query by node_id', nodeId);
            // console.log(nodeTable,'*****')
            // console.log(r)
            return conn.db()
                .collection(DatabaseFactory.hashOfNodePath(nodePath))
                .findOne<Node>({_id: nodeId});
        }
    }

    private async handleQueryObjectTree(
        mapOfNodesToQuery: Map<string, string>,
        domain: string,
        queryModel: QueryModel<any>,
        conn: MongoClient
    ): Promise<any[] | number> {
        const nodesPathList = Object.keys(mapOfNodesToQuery);
        if (nodesPathList.length === 0) {
            devLog('try to get all data on this node', `${domain}/_id`);
            return this.getAllContentsFromTreeTable(
                domain,
                queryModel,
                conn
            );
        }
        let externalKeys = await this.searchExternalKeysFromTree(
            mapOfNodesToQuery,
            nodesPathList,
            domain,
            conn
        );
        if (queryModel?.size && queryModel?.size > 0) {
            const skip = (queryModel.skip && queryModel.skip >= 0) ? queryModel.skip : 0;
            externalKeys = externalKeys.slice(skip, (queryModel.size + skip));
        }
        if (queryModel?.count === true) {
            return externalKeys.length;
        }
        devLog('total cids to fetch data from', externalKeys.length);
        // if (queryModel.cids === true) {
        //     return cids.filter(c => c !== null);
        // }
        // const conn = await this.connection(options);
        const _all_p = externalKeys.map(async x => {
            return conn.db().collection(domain).findOne({_id: x});
            // return r;
            // return this.ipfsFactory.generateDataFromCid(x, {
            //     json: true
            // }, options);
        });
        const _all = await Promise.all(_all_p);
        return _all.filter(t => t !== null);
    }

    private static hashOfNodePath(nodePath: string) {
        // console.log(nodePath,'+++++');
        // console.log(node);
        return createHash('sha1')
            .update(nodePath.toString().trim())
            .digest('hex');
        // return nodePath?.replace(new RegExp('/', 'ig'), '_').trim();
    }

    private static async checkIfNodeDataObjectExistInMainNodeAndShakeTree(
        node: Node,
        nodePath: string,
        domain: string,
        conn: MongoClient
    ): Promise<Node> {
        const internalKeys = Object.keys(node.value);
        const tryPurgeEntryFromNode = async (iKey: string) => {
            try {
                await conn.db().collection(this.hashOfNodePath(nodePath)).updateOne({
                    [`value.${iKey}`]: {
                        $exists: true
                    }
                }, {
                    $unset: {
                        [`value.${iKey}`]: 1
                    }
                });
            } catch (e) {
                console.log(e);
            }
        }
        for (const iKey of internalKeys) {
            const idNode: IdNode = await conn.db()
                .collection(this.hashOfNodePath(`${domain}/_id`))
                .findOne<IdNode>({
                    _id: iKey
                });
            if (!idNode) {
                delete node.value[iKey];
                await tryPurgeEntryFromNode(iKey);
            } else {
                const eKey = node.value[iKey];
                const data = await conn.db().collection(domain).findOne<any>({_id: eKey});
                const nodePathParts = nodePath.split('/');
                let nodePathValue = data;
                for (const nPPart of nodePathParts) {
                    if (nPPart !== domain) {
                        nodePathValue = nodePathValue[nPPart]
                    }
                }
                if (node._id !== null && node._id !== undefined && nodePathValue !== node._id) {
                    delete node.value[iKey];
                    await tryPurgeEntryFromNode(iKey);
                }
                if (Array.isArray(node._ids) && node._ids.indexOf(nodePathValue) < 0) {
                    delete node.value[iKey];
                    await tryPurgeEntryFromNode(iKey);
                }
            }
        }
        return node;
    }

    // private static async checkIfNodeDataStringExistInMainNodeAndShakeTree(
    //     targetNodeId: string,
    //     node: Node,
    //     nodePath: string,
    //     domain: string,
    //     conn: MongoClient
    // ): Promise<any> {
    //     const idNode: IdNode = await conn.db()
    //         .collection(this.hashOfNodePath(`${domain}/_id`))
    //         .findOne<IdNode>({
    //             _id: node._id
    //         });
    //     if (!idNode) {
    //         node.value = null;
    //         conn.db().collection(this.hashOfNodePath(nodePath)).updateOne({
    //             _id: targetNodeId
    //         }, {
    //             $unset: {
    //                 value: 1
    //             }
    //         }).catch(console.log);
    //     }
    //     return node;
    // }

    private async handleDeleteObjectTree(
        nodePathnodeIdMap: Map<string, string>,
        domain: string,
        conn: MongoClient
    ): Promise<{ _id: string }[]> {
        const nodePathList = Object.keys(nodePathnodeIdMap);
        let internalKeyList = [];
        const internalKeyMap = {};
        if (nodePathList.length === 0) {
            return [];
        }
        for (const nodePath of nodePathList) {
            const nodeId = nodePathnodeIdMap[nodePath];
            let node: Node = await this.nodeSearchResult(
                nodePath,
                nodeId,
                conn
            );
            // console.log(node);
            if (node && node.value) {
                if (typeof node.value === "object") {
                    node = await DatabaseFactory.checkIfNodeDataObjectExistInMainNodeAndShakeTree(
                        node,
                        nodePath,
                        domain,
                        conn
                    );
                    // console.log(node, 'after prune');
                    for (const iKey of Object.keys(node.value)) {
                        internalKeyList.push(iKey);
                        if (internalKeyMap[iKey]) {
                            internalKeyMap[iKey] += 1;
                        } else {
                            internalKeyMap[iKey] = 1;
                        }
                    }
                } else if (typeof node.value === 'string') {
                    internalKeyList.push(node._id);
                    if (internalKeyMap[node._id]) {
                        internalKeyMap[node._id] += 1;
                    } else {
                        internalKeyMap[node._id] = 1;
                    }
                }
            }
        }

        internalKeyList = internalKeyList
            .filter(x => internalKeyMap[x] === nodePathList.length)
            .reduce((a, b) => a.add(b), new Set());
        internalKeyList = Array.from(internalKeyList);

        internalKeyList = await Promise.all(
            internalKeyList.map(async iK => {
                await conn.db()
                    .collection(DatabaseFactory.hashOfNodePath(`${domain}/_id`))
                    .deleteOne({
                        _id: iK
                    });
                return {_id: iK};
            })
        );
        return internalKeyList;
    }

    async writeMany<T extends BasicAttributesModel>(
        domain: string,
        data: T[],
        cids: boolean,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any[]> {
        const r = [];
        for (const _data of data) {
            r.push(await this.writeOne(
                domain,
                _data,
                cids,
                context,
                options
            ));
        }
        return r;
    }

    async writeOne<T extends BasicAttributesModel>(
        domain: string,
        data: T,
        cids: boolean,
        context: ContextBlock,
        options: BFastDatabaseOptions,
    ): Promise<any> {
        // const buffer = Buffer.from(JSON.stringify(data));
        // const {cid} = await this.ipfsFactory.generateCidFromData(data, buffer, domain, options);
        await this.withMongoClient(async conn => {
            await conn.db()
                .collection(domain)
                .updateOne(
                    {_id: data._id},
                    {$set: data},
                    {
                        upsert: true,
                    }
                );
            const treeController = new TreeController();
            await treeController.objectToTree(
                data,
                domain,
                this.whenWantToSaveADataNodeToATree(data._id, conn)
            );
        }, options);
        // if (cids === true) {
        //     return insertedId.toString();
        // }
        return data;
    }

    async init(options: BFastDatabaseOptions): Promise<any> {
        // await this.ipfsFactory.ensureIpfs(options);
    }

    async findOne<T extends BasicAttributesModel>(
        domain: string,
        queryModel: QueryModel<T>,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any> {
        return this.withMongoClient(async conn => {
            const treeController = new TreeController();
            const queryTree = await treeController.query(domain, {
                _id: queryModel._id
            });
            const id = Object.values(queryTree)[0];
            // const conn = await this.connection(options);
            const result = await conn.db()
                .collection(DatabaseFactory.hashOfNodePath(Object.keys(queryTree)[0]))
                .findOne(
                    {_id: id},
                    {}
                );
            if (!result) {
                return null;
            }
            const cid = result.value;
            // if (queryModel.cids === true) {
            //     return cid;
            // }
            return conn.db().collection(domain).findOne({_id: cid});
            // return this.ipfsFactory.generateDataFromCid(cid, {
            //     json: true
            // }, options);
        }, options);
    }

    async findMany<T extends BasicAttributesModel>(
        domain: string,
        queryModel: QueryModel<T>,
        context: ContextBlock,
        options: BFastDatabaseOptions
    ): Promise<any> {
        return this.withMongoClient(async conn => {
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
                    const r = await this.handleQueryObjectTree(_tree, domain, queryModel, conn);
                    Array.isArray(r) ?
                        (r.forEach(_r1 => {
                            resultMap[_r1._id] = _r1
                        }))
                        : resultMap[v4()] = r;
                }
                const _result1: any[] = Object.values(resultMap);
                return queryModel?.count ? _result1.reduce((a, b) => a + b, 0) : _result1;
            } else {
                // console.log(nodesToQueryData,'*********');
                return await this.handleQueryObjectTree(nodesToQueryData, domain, queryModel, conn);
            }
        }, options);
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
                cids: false,
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
        return this.writeOne(domain, newDoc, !!updateModel.cids, context, options);
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
            return this.writeMany(domain, oldDocs, !!updateModel.cids, context, options);
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
        return this.withMongoClient(async conn => {
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
                    const r = await this.handleDeleteObjectTree(_tree, domain, conn);
                    Array.isArray(r) ? result.push(...r) : result.push(r);
                }
                return result;
            } else {
                return this.handleDeleteObjectTree(deleteTree, domain, conn);
            }
        }, options);
    }

    async bulk<V>(operations: (session: any) => Promise<any>): Promise<any> {
        return await operations(null);
    }

    async changes(
        domain: string,
        pipeline: any[],
        listener: (doc: ChangesModel) => void,
        resumeToken = undefined,
    ): Promise<{ close: () => void }> {
        const appEventInst = AppEventsFactory.getInstance();
        appEventInst.sub(ConstUtil.DB_CHANGES_EVENT.concat(domain), listener);
        return {
            close: () => {
                appEventInst.unSub(ConstUtil.DB_CHANGES_EVENT.concat(domain), listener);
            }
        }
    }

    async syncs(
        domain: string,
        listener: (doc: ChangesDocModel) => void,
        options: BFastDatabaseOptions,
    ): Promise<{ close: () => void }> {
        const room = `${options.projectId}_${domain}`
        const ydoc = new Y.Doc();
        global.WebSocket = require('ws');
        const webrtcProvider = new WebrtcProvider(
            room,
            ydoc,
            // // @ts-ignore
            // {
            //     // password: domain,
            //     // signaling: [
            //     //     'wss://stun.l.google.com',
            //     //     'wss://stun1.l.google.com',
            //     //     'wss://stun2.l.google.com',
            //     //     'wss://stun3.l.google.com',
            //     //     'wss://stun4.l.google.com',
            //     // ]
            // }
        );
        const websocketProvider = new WebsocketProvider(
            'wss://yjs.bfast.fahamutech.com',
            room,
            ydoc,
            {
                WebSocketPolyfill: require('ws'),
            }
        );
        const sharedMap = ydoc.getMap(domain);
        const observer = async (tEvent: YMapEvent<any>) => {
            for (const key of Array.from(tEvent.keys.keys())) {
                switch (tEvent.keys.get(key).action) {
                    case "add":
                        const doc = sharedMap.get(key);
                        if (!Array.isArray(doc)) {
                            this.updateOne(
                                domain,
                                {
                                    id: doc._id,
                                    upsert: true,
                                    update: {
                                        $set: doc
                                    }
                                },
                                {},
                                options
                            ).catch(console.log);
                            listener({
                                name: "create",
                                snapshot: doc,
                                resumeToken: doc._id
                            });
                        }
                        // console.log(, 'ADD');
                        break;
                    case "delete":
                        this.delete(
                            domain,
                            {
                                id: key
                            },
                            {},
                            options
                        ).catch(console.log);
                        listener({
                            name: "delete",
                            snapshot: {_id: key},
                            resumeToken: key
                        });
                        // console.log(key, 'DELETE');
                        break;
                    case "update":
                        const d = sharedMap.get(key);
                        const od = tEvent.keys.get(key).oldValue;
                        // console.log(d, 'NEW');
                        // console.log(od, 'OLD');
                        // console.log(JSON.stringify(d)!==JSON.stringify(od));
                        if (!Array.isArray(d) && JSON.stringify(d) !== JSON.stringify(od)) {
                            this.updateOne(
                                domain,
                                {
                                    id: key,
                                    upsert: true,
                                    update: {
                                        $set: d
                                    }
                                },
                                {},
                                options
                            ).catch(console.log);
                            listener({
                                name: "update",
                                snapshot: d,
                                resumeToken: d._id
                            });
                        }
                        // console.log(sharedMap.get(key), 'UPDATE');
                        break;
                }
            }
            // const data = sharedMap.toJSON();
        }
        sharedMap.observe(observer);
        let pData = await this.findMany(
            domain,
            {
                filter: {}
            },
            {useMasterKey: true},
            options
        );
        if (!pData) {
            pData = [];
        }
        pData.forEach(data => {
            if (data.id) {
                data._id = data.id;
                delete data.id;
            }
            // if (data._created_at) {
            //     data.createdAt = data._created_at;
            //     delete data._created_at;
            // }
            // if (data._updated_at) {
            //     data.updatedAt = data._updated_at;
            //     delete data._updated_at;
            // }
            // if (data._created_by) {
            //     data.createdBy = data._created_by;
            //     delete data._created_by;
            // }
            sharedMap.set(data._id, data);
        });
        return {
            close: () => {
                try {
                    webrtcProvider.disconnect();
                    websocketProvider.disconnectBc();
                    sharedMap.unobserve(observer);
                    ydoc.destroy();
                } catch (e) {
                    console.log(e);
                }
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
        domain: string,
        queryModel: QueryModel<any>,
        conn: MongoClient
    ): Promise<any[] | number> {
        // const conn = await this.connection(options);
        let result = await conn.db()
            .collection(DatabaseFactory.hashOfNodePath(`${domain}/_id`))
            .find({})
            .toArray();
        if (result && Array.isArray(result)) {
            if (queryModel?.size && queryModel?.size > 0) {
                const skip = (queryModel.skip && queryModel.skip >= 1) ? queryModel.skip : 0;
                result = result.slice(skip, (queryModel.size + skip));
            }
            if (queryModel?.count === true) {
                return result.length;
            }
            devLog('total cids to fetch data from', result.length);
            // if (queryModel.cids === true) {
            //     return result.map(x => x?.value).filter(y => y !== null);
            // }
            const _all_p = result.map(x => {
                return conn.db().collection(domain).findOne({_id: x?.value});
                // return this.ipfsFactory.generateDataFromCid(x?.value, {
                //     json: true
                // }, options);
            });
            const _all = await Promise.all(_all_p);
            return _all.filter(b => b !== null);
        } else {
            return [];
        }
    }

    async searchExternalKeysFromTree(
        nodePathnodeIdMap: Map<string, string>,
        nodePathList: Array<string>,
        domain: string,
        conn: MongoClient
    ): Promise<string[]> {
        let externalKeyList = [];
        const externalKeyMap = {};
        for (const nodePath of nodePathList) {
            const nodeId = nodePathnodeIdMap[nodePath];
            let node: Node = await this.nodeSearchResult(
                nodePath,
                nodeId,
                conn
            );
            if (node && node.value) {
                if (typeof node.value === "object") {
                    node = await DatabaseFactory.checkIfNodeDataObjectExistInMainNodeAndShakeTree(
                        node,
                        nodePath,
                        domain,
                        conn
                    );
                    for (const eKey of Object.values<string>(node.value)) {
                        externalKeyList.push(eKey);
                        if (externalKeyMap[eKey]) {
                            externalKeyMap[eKey] += 1;
                        } else {
                            externalKeyMap[eKey] = 1;
                        }
                    }
                }
                if (typeof node.value === 'string') {
                    externalKeyList.push(node.value as string);
                    if (externalKeyMap[node.value as string]) {
                        externalKeyMap[node.value as string] += 1;
                    } else {
                        externalKeyMap[node.value as string] = 1;
                    }
                }
            }
        }
        externalKeyList = externalKeyList
            .filter(x => externalKeyMap[x] === nodePathList.length)
            .reduce((a, b) => a.add(b), new Set());
        externalKeyList = Array.from(externalKeyList);
        return externalKeyList;
    }
}
