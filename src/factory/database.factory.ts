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
import {Node} from "../model/node";

export class DatabaseFactory implements DatabaseAdapter {

    constructor() {
    }

    whenWantToSaveADataNodeToATree(cid: string, conn: MongoClient) {
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
                    await conn.db().collection(this.hashOfNodePath(path)).updateOne({
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
                return cid?.toString();
            }
        }
    }

    async withMongoClient(fn: (conn: MongoClient) => Promise<any>, options: BFastDatabaseOptions) {
        const conn = await MongoClient.connect(options.mongoDbUri);
        try {
            return await fn(conn);
        } finally {
            conn.close().catch(reason => {
                console.log(reason, 'close connection FAIL *******');
            });
        }
    }

    async nodeSearchResult(
        nodePath: string,
        nodeId: any,
        conn: MongoClient
    ): Promise<Node | Array<Node>> {
        if (typeof nodeId === "object" && nodeId?.hasOwnProperty('$fn')) {
            devLog('handle query by expression', nodeId.$fn);
            let cursor = conn.db().collection(this.hashOfNodePath(nodePath)).find<Node>({});
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
                const next: Node = await cursor.next();
                const fn = new Function('it', nodeId.$fn);
                fn(next._id) === true ? docs.push(next) : null
            }
            devLog('query has found items', docs.length);
            // console.log(docs);
            return docs;
            // return docs.reduce<Node>((a, b: Node | IdNode) => {
            //     if (typeof b.value === 'string') {
            //         a.value = Object.assign(a.value, {[b._id]: b.value});
            //     } else {
            //         a.value = Object.assign(a.value, b.value);
            //     }
            //     a._ids.push(b._id);
            //     return a;
            // }, {value: {}, _id: null, _ids: []});
        } else {
            // const conn = await this.connection(options)
            devLog('handle query by node_id', nodeId);
            // console.log(nodeTable,'*****')
            // console.log(r)
            return conn.db().collection(this.hashOfNodePath(nodePath)).findOne<Node>({_id: nodeId});
        }
    }

    async handleQueryObjectTree(
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

    hashOfNodePath(nodePath: string): string {
        return createHash('sha1')
            .update(nodePath.toString().trim())
            .digest('hex');
        // return nodePath?.replace(new RegExp('/', 'ig'), '_').trim();
    }

    async checkIfNodeDataObjectExistInMainNodeAndShakeTree(
        node: Node,
        nodePath: string,
        domain: string,
        conn: MongoClient
    ): Promise<Node> {
        const internalKeys = Object.keys(node?.value ? node.value : {});
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
        const removeInNode = async (iKey: string, eKey: string, nodePathValue: any) => {
            if (node._id !== null && node._id !== undefined) {
                if (nodePathValue === null || nodePathValue === undefined) {
                    delete node?.value[iKey];
                    await tryPurgeEntryFromNode(iKey);
                } else if (nodePathValue[node._id]?.[iKey] !== eKey) {
                    delete node?.value[iKey];
                    await tryPurgeEntryFromNode(iKey);
                }
            }
            // if (Array.isArray(node._ids)) {
            //     delete node?.value[iKey];
            //     await tryPurgeEntryFromNode(iKey);
            // }
        }
        for (const iKey of internalKeys) {
            const idNode: Node = await conn.db()
                .collection(this.hashOfNodePath(`${domain}/_id`))
                .findOne<Node>({
                    _id: iKey
                });
            if (!idNode) {
                delete node?.value[iKey];
                await tryPurgeEntryFromNode(iKey);
            } else {
                const eKey = node?.value[iKey];
                const data = await conn.db().collection(domain).findOne<any>({_id: eKey});
                if (data === null || data === undefined) {
                    await removeInNode(iKey, eKey, data);
                    return;
                }
                // console.log(data, '*****DATA******');
                const tree = new TreeController();
                // @ts-ignore
                const tD = await tree.objectToTree(data, domain, {
                    nodeIdHandler: () => data?._id ? data._id : data?.id
                });
                // console.log(tD, '*****TREE******');
                const nodePathParts = nodePath.split('/');
                // if ()nodePathParts.push(node._id);
                // nodePathParts.push(iKey);
                // console.log(iKey);
                // console.log(nodePathParts);
                let nodePathValue = tD;
                for (const nPPart of nodePathParts) {
                    if (nPPart !== domain) {
                        if (nodePathValue === null || nodePathValue === undefined) {
                            await removeInNode(iKey, eKey, nodePathValue);
                            return;
                        }
                        nodePathValue = nodePathValue[nPPart];
                        // console.log(nodePathValue);
                    }
                }
                await removeInNode(iKey, eKey, nodePathValue);
            }
        }
        return node;
    }

    async handleDeleteObjectTree(
        nodePathnodeIdMap: Map<string, string>,
        domain: string,
        conn: MongoClient
    ): Promise<{ _id: string }[]> {
        const nodePathList = Object.keys(nodePathnodeIdMap);
        let internalKeyList = await this.searchInternalKeysFromTree(
            nodePathnodeIdMap,
            nodePathList,
            domain,
            conn
        );
        return await Promise.all(
            internalKeyList.map(async iK => {
                await conn.db()
                    .collection(this.hashOfNodePath(`${domain}/_id`))
                    .deleteOne({
                        _id: iK
                    });
                return {_id: iK};
            })
        );
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
                    {_id: data?._id},
                    {$set: data},
                    {
                        upsert: true,
                    }
                );
            const treeController = new TreeController();
            await treeController.objectToTree(
                data,
                domain,
                this.whenWantToSaveADataNodeToATree(data?._id ? data._id : data.id, conn)
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
                .collection(this.hashOfNodePath(Object.keys(queryTree)[0]))
                .findOne(
                    {_id: id},
                    {}
                );
            if (!result) {
                return null;
            }
            const cid = result?.value;
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
        options: BFastDatabaseOptions,
    ): Promise<{ close: () => void }> {
        const room = `${options.projectId}_${domain}`
        const ydoc = new Y.Doc();
        global.WebSocket = require('ws');
        const webrtcProvider = new WebrtcProvider(room, ydoc);
        const websocketProvider = new WebsocketProvider(
            'wss://demos.yjs.dev',
            room,
            ydoc,
            {
                WebSocketPolyfill: require('ws'),
            }
        );
        let sharedMap = ydoc.getMap(domain);
        const observer = async (tEvent: YMapEvent<any>) => {
            for (const key of Array.from(tEvent.keys.keys())) {
                switch (tEvent.keys.get(key).action) {
                    case "add":
                        const doc = this.sanitize4DB(sharedMap.get(key));
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
                        }
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
                        break;
                    case "update":
                        const d = sharedMap.get(key);
                        const od = tEvent.keys.get(key).oldValue;
                        if (!Array.isArray(d) && JSON.stringify(d) !== JSON.stringify(od)) {
                            this.updateOne(
                                domain,
                                {
                                    id: key,
                                    upsert: true,
                                    update: {
                                        $set: this.sanitize4DB(d)
                                    }
                                },
                                {},
                                options
                            ).catch(console.log);
                        }
                        break;
                }
            }
        }
        sharedMap.observe(observer);
        return {
            close: () => {
                try {
                    webrtcProvider?.disconnect();
                    websocketProvider?.disconnectBc();
                    sharedMap?.unobserve(observer);
                    ydoc?.destroy();
                    sharedMap = undefined;
                } catch (e) {
                    console.log(e);
                }
            }
        }
    }

    incrementFields(newDoc: any, ip: { [p: string]: any }) {
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
        let nodes: Array<Node> = await conn.db()
            .collection(this.hashOfNodePath(`${domain}/_id`))
            .find<Node>({})
            .toArray();
        if (nodes && Array.isArray(nodes)) {
            if (queryModel?.size && queryModel?.size > 0) {
                const skip = (queryModel.skip && queryModel.skip >= 1) ? queryModel.skip : 0;
                nodes = nodes.slice(skip, (queryModel.size + skip));
            }
            if (queryModel?.count === true) {
                return nodes.length;
            }
            devLog('total cids to fetch data from', nodes.length);
            // if (queryModel.cids === true) {
            //     return result.map(x => x?.value).filter(y => y !== null);
            // }
            const _all_p = nodes.map(x => {
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
        let externalKeyMap = {};
        for (const nodePath of nodePathList) {
            const nodeId = nodePathnodeIdMap[nodePath];
            let node: Node | Array<Node> = await this.nodeSearchResult(
                nodePath,
                nodeId,
                conn
            );
            if (Array.isArray(node)) {
                for (const n of node) {
                    const r = await this.extractExternalKeysFromNodes(
                        n,
                        domain,
                        nodePath,
                        externalKeyList,
                        externalKeyMap,
                        conn
                    );
                    externalKeyList = r.externalKeyList;
                    externalKeyMap = r.externalKeyMap;
                }
            } else {
                const r = await this.extractExternalKeysFromNodes(
                    node,
                    domain,
                    nodePath,
                    externalKeyList,
                    externalKeyMap,
                    conn
                );
                externalKeyList = r.externalKeyList;
                externalKeyMap = r.externalKeyMap;
            }
        }
        externalKeyList = externalKeyList
            .filter(x => externalKeyMap[x] === nodePathList.length)
            .reduce((a, b) => a.add(b), new Set());
        externalKeyList = Array.from(externalKeyList);
        return externalKeyList;
    }

    async searchInternalKeysFromTree(
        nodePathnodeIdMap: Map<string, string>,
        nodePathList: Array<string>,
        domain: string,
        conn: MongoClient
    ): Promise<string[]> {
        let internalKeyList = [];
        let internalKeyMap = new Map();
        for (const nodePath of nodePathList) {
            const nodeId = nodePathnodeIdMap[nodePath];
            let node: Node | Array<Node> = await this.nodeSearchResult(
                nodePath,
                nodeId,
                conn
            );
            if (Array.isArray(node)) {
                for (const n of node) {
                    const r = await this.extractInternalKeysFromNodes(
                        n,
                        domain,
                        nodePath,
                        internalKeyList,
                        internalKeyMap,
                        conn
                    );
                    internalKeyList = r.internalKeyList;
                    internalKeyMap = r.internalKeyMap;
                }
            } else {
                const r = await this.extractInternalKeysFromNodes(
                    node,
                    domain,
                    nodePath,
                    internalKeyList,
                    internalKeyMap,
                    conn
                );
                internalKeyList = r.internalKeyList;
                internalKeyMap = r.internalKeyMap;
            }
        }
        internalKeyList = internalKeyList
            .filter(x => internalKeyMap[x] === nodePathList.length)
            .reduce((a, b) => a.add(b), new Set());
        internalKeyList = Array.from(internalKeyList);
        return internalKeyList;
    }

    async extractExternalKeysFromNodes(
        node: Node,
        domain: string,
        nodePath: string,
        externalKeyList,
        externalKeyMap,
        conn: MongoClient
    ): Promise<{ externalKeyList: Array<string>, externalKeyMap: any }> {
        if (node && node.value) {
            if (typeof node.value === "object") {
                node = await this.checkIfNodeDataObjectExistInMainNodeAndShakeTree(
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
        return {
            externalKeyList,
            externalKeyMap
        }
    }

    async extractInternalKeysFromNodes(
        node: Node,
        domain: string,
        nodePath: string,
        internalKeyList: Array<string>,
        internalKeyMap: Map<any, any>,
        conn: MongoClient
    ): Promise<{ internalKeyList: Array<string>, internalKeyMap: any }> {
        if (node && node.value) {
            if (typeof node.value === "object") {
                node = await this.checkIfNodeDataObjectExistInMainNodeAndShakeTree(
                    node,
                    nodePath,
                    domain,
                    conn
                );
                for (const iKey of Object.keys(node.value)) {
                    internalKeyList.push(iKey);
                    if (internalKeyMap[iKey]) {
                        internalKeyMap[iKey] += 1;
                    } else {
                        internalKeyMap[iKey] = 1;
                    }
                }
            }
            if (typeof node.value === 'string') {
                internalKeyList.push(node._id as string);
                if (internalKeyMap[node._id as string]) {
                    internalKeyMap[node._id as string] += 1;
                } else {
                    internalKeyMap[node._id as string] = 1;
                }
            }
        }
        return {
            internalKeyList: internalKeyList,
            internalKeyMap: internalKeyMap
        }
    }

    private sanitize4DB(data: any) {
        if (data === null || data === undefined) {
            return null;
        }
        if (data && data.hasOwnProperty('return')) {
            delete data.return;
        }
        if (data && data.hasOwnProperty('id')) {
            data._id = data.id;
            delete data.id;
        }

        if (data && data.hasOwnProperty('_created_at')) {
            data.createdAt = data._created_at;
            delete data._created_at;
        }

        if (data && data.hasOwnProperty('_updated_at')) {
            data.updatedAt = data._updated_at;
            delete data._updated_at;
        }

        if (data && data.hasOwnProperty('_created_by')) {
            data.createdBy = data._created_by;
            delete data._created_by;
        }
        if (!data.hasOwnProperty('createdAt') || typeof data.createdAt === "object") {
            data.createdAt = new Date().toISOString();
        }
        if (!data.hasOwnProperty('updatedAt') || typeof data.updatedAt === "object") {
            data.updatedAt = new Date().toISOString();
        }
        return data;
    }
}
