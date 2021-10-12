import {BasicAttributesModel} from '../model/basic-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {
    GetDataFn,
    GetNodeFn, GetNodesFn,
    InitDatabaseFn, PurgeNodeFn, PurgeNodeValueFn,
    UpsertDataFn,
    UpsertNodeFn
} from '../adapters/database.adapter';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {DeleteModel} from '../model/delete-model';
import {QueryModel} from '../model/query-model';
import {SecurityController} from './security.controller';
import {ChangesModel} from '../model/changes.model';
import {ChangesDocModel} from "../model/changes-doc.model";
import {AppEventsFactory} from "../factory/app-events.factory";
import {ConstUtil} from "../utils/const.util";
import {BFastOptions} from "../bfast-database.option";
import {TreeController} from "bfast-database-tree";
import {createHash} from "crypto";
import {Node} from '../model/node'
import {Cursor} from "../model/cursor";
import {DatabaseWriteOptions} from "../model/database-write-options";
import {DatabaseUpdateOptions} from "../model/database-update-options";
import {DatabaseBasicOptions} from "../model/database-basic-options";
import {DatabaseChangesOptions} from "../model/database-changes-options";

export async function getAllContentsFromTreeTable(
    domain: string,
    queryModel: QueryModel<any>,
    getNodes: GetNodesFn<Node>,
    getData: GetDataFn,
    options: BFastOptions
): Promise<any[] | number> {
    const nodePathHash = hashOfNodePath(`${domain}/_id`);
    const cursor: Cursor<Node> = await getNodes(nodePathHash, options);
    let nodes: Node[] = await cursor.toArray();
    if (nodes && Array.isArray(nodes)) {
        if (queryModel?.size && queryModel?.size > 0) {
            const skip = (queryModel.skip && queryModel.skip >= 1) ? queryModel.skip : 0;
            nodes = nodes.slice(skip, (queryModel.size + skip));
        }
        if (queryModel?.count === true) {
            return nodes.length;
        }
        const all_p = nodes.map(x => getData(domain, x?.value as string, options));
        const all = await Promise.all(all_p);
        return all.filter(b => b !== null);
    } else {
        return [];
    }
}

export async function nodeSearchResult(
    nodePath: string,
    nodeId: any,
    getNodes: GetNodesFn<Node>,
    getNode: GetNodeFn,
    options: BFastOptions
): Promise<Node | Array<Node>> {
    const pathHash = hashOfNodePath(nodePath);
    if (typeof nodeId === "object" && nodeId?.hasOwnProperty('$fn')) {
        let cursor = await getNodes(pathHash, options);
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
        return docs;
    } else {
        return getNode(pathHash, nodeId, options);
    }
}

export async function checkIfNodeDataObjectExistInMainNodeAndShakeTree(
    node: Node,
    nodePath: string,
    domain: string,
    purgeNodeValue: PurgeNodeValueFn,
    getNode: GetNodeFn,
    getData: GetDataFn,
    options: BFastOptions
): Promise<Node> {
    const internalKeys = Object.keys(node?.value ? node.value : {});
    const tryPurgeEntryFromNode = async (iKey: string) => {
        try {
            const pathHash = hashOfNodePath(nodePath);
            await purgeNodeValue(pathHash, iKey, options);
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
    }
    for (const iKey of internalKeys) {
        const mainNodePathHash = hashOfNodePath(`${domain}/_id`);
        const idNode: Node = await getNode(mainNodePathHash, iKey, options)
        if (!idNode) {
            delete node?.value[iKey];
            await tryPurgeEntryFromNode(iKey);
        } else {
            const eKey = node?.value[iKey];
            const data = await getData(domain, eKey, options);
            if (data === null || data === undefined) {
                await removeInNode(iKey, eKey, data);
                return;
            }
            const tree = new TreeController();
            // @ts-ignore
            const tD = await tree.objectToTree(data, domain, {
                nodeIdHandler: () => data?._id ? data._id : data?.id
            });
            const nodePathParts = nodePath.split('/');
            let nodePathValue = tD;
            for (const nPPart of nodePathParts) {
                if (nPPart !== domain) {
                    if (nodePathValue === null || nodePathValue === undefined) {
                        await removeInNode(iKey, eKey, nodePathValue);
                        return;
                    }
                    nodePathValue = nodePathValue[nPPart];
                }
            }
            await removeInNode(iKey, eKey, nodePathValue);
        }
    }
    return node;
}


export async function extractExternalKeysFromNodes(
    node: Node,
    domain: string,
    nodePath: string,
    externalKeyList,
    externalKeyMap,
    purgeNodeValue: PurgeNodeValueFn,
    getNode: GetNodeFn,
    getData: GetDataFn,
    options: BFastOptions
): Promise<{ externalKeyList: Array<string>, externalKeyMap: any }> {
    if (node && node.value) {
        if (typeof node.value === "object") {
            node = await checkIfNodeDataObjectExistInMainNodeAndShakeTree(
                node,
                nodePath,
                domain,
                purgeNodeValue,
                getNode,
                getData,
                options
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

export async function searchExternalKeysFromTree(
    nodePathnodeIdMap: Map<string, string>,
    nodePathList: Array<string>,
    domain: string,
    purgeNodeValue: PurgeNodeValueFn,
    getData: GetDataFn,
    getNodes: GetNodesFn<Node>,
    getNode: GetNodeFn,
    options: BFastOptions
): Promise<string[]> {
    let externalKeyList = [];
    let externalKeyMap = {};
    for (const nodePath of nodePathList) {
        const nodeId = nodePathnodeIdMap[nodePath];
        let node: Node | Array<Node> = await nodeSearchResult(
            nodePath,
            nodeId,
            getNodes,
            getNode,
            options
        );
        if (Array.isArray(node)) {
            for (const n of node) {
                const r = await extractExternalKeysFromNodes(
                    n,
                    domain,
                    nodePath,
                    externalKeyList,
                    externalKeyMap,
                    purgeNodeValue,
                    getNode,
                    getData,
                    options
                );
                externalKeyList = r.externalKeyList;
                externalKeyMap = r.externalKeyMap;
            }
        } else {
            const r = await extractExternalKeysFromNodes(
                node,
                domain,
                nodePath,
                externalKeyList,
                externalKeyMap,
                purgeNodeValue,
                getNode,
                getData,
                options
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

export async function handleQueryObjectTree(
    mapOfNodesToQuery: Map<string, string>,
    domain: string,
    queryModel: QueryModel<any>,
    purgerNodeValue: PurgeNodeValueFn,
    getNodes: GetNodesFn<Node>,
    getNode: GetNodeFn,
    getData: GetDataFn,
    options: BFastOptions
): Promise<any[] | number> {
    const nodesPathList = Object.keys(mapOfNodesToQuery);
    if (nodesPathList.length === 0) {
        return getAllContentsFromTreeTable(domain, queryModel, getNodes, getData, options);
    }
    let externalKeys = await searchExternalKeysFromTree(
        mapOfNodesToQuery,
        nodesPathList,
        domain,
        purgerNodeValue,
        getData,
        getNodes,
        getNode,
        options
    );
    if (queryModel?.size && queryModel?.size > 0) {
        const skip = (queryModel.skip && queryModel.skip >= 0) ? queryModel.skip : 0;
        externalKeys = externalKeys.slice(skip, (queryModel.size + skip));
    }
    if (queryModel?.count === true) {
        return externalKeys.length;
    }
    const all_p = externalKeys.map(x => getData(domain, x, options));
    const all = await Promise.all(all_p);
    return all.filter(t => t !== null);
}

export async function handleDomainValidation(domain: string): Promise<any> {
    if (!validDomain(domain)) {
        throw {
            message: `${domain} is not a valid domain name`
        };
    }
    return true;
}

export async function init(init: InitDatabaseFn, options: BFastOptions): Promise<any> {
    return init(options);
}

export async function checkPolicyInDomain(domain: string, options: DatabaseWriteOptions) {
    if (options && options.bypassDomainVerification === false) {
        await handleDomainValidation(domain);
    }
}

export function hashOfNodePath(nodePath: string): string {
    console.log('Before hash ---> ', nodePath)
    const l = nodePath.match(new RegExp('[0-9a-f]{40}', 'ig'));
    if (Array.isArray(l) && l?.length > 0) {
        console.log('Its already hashed -----> ', nodePath);
        return nodePath;
    }
    return createHash('sha1').update(nodePath.toString().trim()).digest('hex');
}

export function whenWantToSaveADataNodeToATree(eKey: string, upsertNode: UpsertNodeFn<any>, options: BFastOptions) {
    return {
        nodeHandler: async ({path, node}) => {
            for (const key of Object.keys(node)) {
                let $setMap: Node = {
                    _id: isNaN(Number(key)) ? key.trim() : Number(key),
                    value: {}
                };
                if (typeof node[key] === "object") {
                    $setMap = Object.keys(node[key]).reduce((a: Node, b) => {
                        a.value[b] = node[key][b];
                        return a;
                    }, {_id: null, value: {}});
                } else {
                    $setMap.value = node[key]
                }
                const pathHash = hashOfNodePath(path);
                await upsertNode(pathHash, $setMap, options);
            }
        },
        nodeIdHandler: async function () {
            return eKey?.toString();
        }
    }
}

export async function writeOne<T extends BasicAttributesModel>(
    domain: string,
    data: T,
    cids: boolean,
    upsertNode: UpsertNodeFn<T>,
    upsertData: UpsertDataFn<T>,
    security: SecurityController,
    context: ContextBlock,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<T> {
    await checkPolicyInDomain(domain, writeOptions);
    const returnFields = getReturnFields(data);
    const sanitizedDataWithCreateMetadata = addCreateMetadata(data, security, context);
    const sanitizedData: any = sanitize4Db(sanitizedDataWithCreateMetadata);
    const treeController = new TreeController();
    await treeController.objectToTree(sanitizedData, domain, whenWantToSaveADataNodeToATree(
        sanitizedData._id,
        upsertNode,
        options
    ));
    const savedData: any = await upsertData(domain, sanitizedData, options);
    const cleanDoc: any = sanitize4User(savedData, returnFields) as T;
    publishChanges(domain, {
        _id: cleanDoc?.id,
        fullDocument: cleanDoc,
        documentKey: cleanDoc?.id,
        operationType: "create"
    });
    return cleanDoc;
}

export async function writeMany<T extends BasicAttributesModel>(
    domain: string,
    data: T[],
    cids: boolean,
    upsertNode: UpsertNodeFn<any>,
    upsertData: UpsertDataFn<any>,
    security: SecurityController,
    context: ContextBlock,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<any[]> {
    const dP = data
        .map(d => writeOne(domain, d, cids, upsertNode, upsertData, security, context, writeOptions, options));
    return Promise.all(dP);
}

export function incrementFields(newDoc: any, ip: { [p: string]: any }) {
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
                newDoc[key] = incrementFields(newDoc[key], ip[key]);
            }
        }
        return newDoc;
    }
}

export async function updateOne(
    domain: string,
    updateModel: UpdateRuleRequestModel,
    getNode: GetNodeFn,
    getData: GetDataFn,
    upsertNode: UpsertNodeFn<any>,
    upsertData: UpsertDataFn<any>,
    security: SecurityController,
    context: ContextBlock,
    updateOptions: DatabaseUpdateOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<any> {
    await checkPolicyInDomain(domain, updateOptions);
    if (updateModel.upsert === true) {
        if (!updateModel.update.hasOwnProperty('$set')) {
            updateModel.update.$set = {id: security.generateUUID()}
        }
    }
    const returnFields = getReturnFields(updateModel as any);
    updateModel = altUpdateModel(updateModel, context);
    updateOptions.dbOptions = updateModel && updateModel.options ? updateModel.options : {};
    const fQm = {id: updateModel.id, cids: false, return: []};
    let oldDoc = await findById(domain, fQm, getNode, getData, updateOptions, options);
    if (!oldDoc && updateModel.upsert === true) {
        oldDoc = {id: updateModel.id};
    }
    if (!oldDoc) {
        return null;
    }
    const updateParts = updateModel.update.$set;
    const incrementParts = updateModel.update.$inc;
    let newDoc = Object.assign(oldDoc, updateParts);
    newDoc = incrementFields(newDoc, incrementParts);
    const updatedDoc = await writeOne(domain, newDoc, !!updateModel.cids, upsertNode, upsertData,
        security, context, updateOptions, options);
    const cleanDoc = sanitize4User(updatedDoc, returnFields);
    publishChanges(domain, {
        _id: updatedDoc?._id,
        fullDocument: updatedDoc,
        documentKey: updatedDoc?._id,
        operationType: "update"
    });
    return cleanDoc;
}

function altUpdateModel(updateModel: UpdateRuleRequestModel, context: ContextBlock) {
    updateModel.update = sanitizeWithOperator4Db(updateModel?.update as any);
    updateModel.filter = sanitizeWithOperator4Db(updateModel?.filter as any);
    updateModel.update = addUpdateMetadata(updateModel?.update as any, context);
    return updateModel;
}

export async function updateMany(
    domain: string,
    updateModel: UpdateRuleRequestModel,
    purgeNodeValue: PurgeNodeValueFn,
    getNodes: GetNodesFn<Node>,
    getNode: GetNodeFn,
    getData: GetDataFn,
    upsertNode: UpsertNodeFn<any>,
    upsertData: UpsertDataFn<any>,
    security: SecurityController,
    context: ContextBlock,
    updateOptions: DatabaseUpdateOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<any[]> {
    if (updateModel.filter && typeof updateModel.filter === 'object' && Object.keys(updateModel.filter).length > 0) {
        await checkPolicyInDomain(domain, updateOptions);
        if (updateModel.upsert === true) {
            if (!updateModel.update.hasOwnProperty('$set')) {
                updateModel.update.$set = {}
            }
            if (!updateModel.update.$set.hasOwnProperty('_id')) {
                updateModel.update.$set._id = security.generateUUID();
            }
        }
        updateModel = altUpdateModel(updateModel, context);
        updateOptions.dbOptions = updateModel && updateModel.options ? updateModel.options : {};

        const oldDocs = await findByFilter(domain, updateModel, purgeNodeValue, getNodes, getNode, getData, security,
            context,
            updateOptions,
            options
        );
        if (Array.isArray(oldDocs) && oldDocs.length === 0 && updateModel.upsert === true) {
            let nDoc = Object.assign(updateModel.update.$set, updateModel.filter);
            const incrementParts = updateModel.update.$inc;
            nDoc = incrementFields(nDoc, incrementParts);
            oldDocs.push(nDoc);
            return writeMany(domain, oldDocs, !!updateModel.cids, upsertNode, upsertData, security,
                context, updateOptions, options);
        }
        for (const x of oldDocs) {
            const uQm = {update: updateModel.update, upsert: updateModel.upsert, id: x._id, return: []}
            oldDocs[oldDocs.indexOf(x)] = await updateOne(
                domain,
                uQm,
                getNode,
                getData,
                upsertNode,
                upsertData,
                security,
                context,
                updateOptions,
                options
            );
        }
        return oldDocs.map(_t1 => {
            const cleanDoc = sanitize4User(_t1, updateModel.return);
            publishChanges(domain, {
                _id: _t1?._id,
                fullDocument: _t1,
                documentKey: _t1?._id,
                operationType: "update"
            });
            return cleanDoc;
        });
    }
    throw {message: 'you must supply filter object in update model'};
}

export async function searchInternalKeysFromTree(
    nodePathnodeIdMap: Map<string, string>,
    nodePathList: Array<string>,
    domain: string,
    purgeNodeValue: PurgeNodeValueFn,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getData: GetDataFn,
    options: BFastOptions
): Promise<string[]> {
    let internalKeyList = [];
    let internalKeyMap = new Map();
    for (const nodePath of nodePathList) {
        const nodeId = nodePathnodeIdMap[nodePath];
        let node: Node | Array<Node> = await nodeSearchResult(nodePath, nodeId, getNodes, getNode, options);
        if (Array.isArray(node)) {
            for (const n of node) {
                const r = await extractInternalKeysFromNodes(n, domain, nodePath, internalKeyList, internalKeyMap,
                    purgeNodeValue,
                    getNode,
                    getData,
                    options
                );
                internalKeyList = r.internalKeyList;
                internalKeyMap = r.internalKeyMap;
            }
        } else {
            const r = await extractInternalKeysFromNodes(node, domain, nodePath, internalKeyList, internalKeyMap,
                purgeNodeValue,
                getNode,
                getData,
                options
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

export async function extractInternalKeysFromNodes(
    node: Node,
    domain: string,
    nodePath: string,
    internalKeyList: Array<string>,
    internalKeyMap: Map<any, any>,
    purgeNodeValue: PurgeNodeValueFn,
    getNode: GetNodeFn,
    getData: GetDataFn,
    options: BFastOptions
): Promise<{ internalKeyList: Array<string>, internalKeyMap: any }> {
    if (node && node.value) {
        if (typeof node.value === "object") {
            node = await checkIfNodeDataObjectExistInMainNodeAndShakeTree(node, nodePath, domain, purgeNodeValue,
                getNode,
                getData,
                options
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

export async function handleDeleteObjectTree(
    nodePathnodeIdMap: Map<string, string>,
    domain: string,
    purgeNodeValue: PurgeNodeValueFn,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getData: GetDataFn,
    purgeNode: PurgeNodeFn,
    options: BFastOptions
): Promise<{ _id: string }[]> {
    const nodePathList = Object.keys(nodePathnodeIdMap);
    let internalKeyList = await searchInternalKeysFromTree(nodePathnodeIdMap, nodePathList, domain, purgeNodeValue,
        getNodes,
        getNode,
        getData,
        options
    );
    const pathHash = hashOfNodePath(`${domain}/_id`);
    return await Promise.all(
        internalKeyList.map(async iK => purgeNode(pathHash, iK, options))
    );
}

export async function remove(
    domain: string,
    deleteModel: DeleteModel<any>,
    purgeNodeValue: PurgeNodeValueFn,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getData: GetDataFn,
    purgeNode: PurgeNodeFn,
    security: SecurityController,
    context: ContextBlock,
    basicOptions: DatabaseBasicOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<any> {
    await checkPolicyInDomain(domain, basicOptions);
    deleteModel.filter = sanitizeWithOperator4Db(deleteModel?.filter as any);

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
    let result = [];
    if (Array.isArray(deleteTree)) {
        for (const _tree of deleteTree) {
            const r = await handleDeleteObjectTree(_tree, domain, purgeNodeValue, getNodes, getNode, getData,
                purgeNode, options);
            Array.isArray(r) ? result.push(...r) : result.push(r);
        }
    } else {
        result = await handleDeleteObjectTree(deleteTree, domain, purgeNodeValue, getNodes, getNode, getData, purgeNode, options);
    }

    return result.map(t => {
        const cleanDoc = sanitize4User(t, deleteModel.return);
        publishChanges(domain, {
            _id: t?._id,
            fullDocument: t,
            documentKey: t?._id,
            operationType: "delete"
        });
        return cleanDoc;
    });
}

export async function bulk<S>(
    operations: (session: S) => Promise<any>
): Promise<any> {
    return await operations(null);
}

export async function changes(
    domain: string,
    pipeline: any[],
    security: SecurityController,
    listener: (doc: ChangesDocModel) => void,
    options: DatabaseChangesOptions = {bypassDomainVerification: false, resumeToken: undefined}
): Promise<{ close: () => void }> {
    if (options && options.bypassDomainVerification === false) {
        await handleDomainValidation(domain);
    }
    const _listener = (doc: ChangesModel) => {
        switch (doc.operationType) {
            case 'create':
                listener({
                    name: 'create',
                    resumeToken: doc._id,
                    snapshot: sanitize4User(doc.fullDocument, [])
                });
                return;
            case 'update':
                listener({
                    name: 'update',
                    resumeToken: doc._id,
                    snapshot: sanitize4User(doc.fullDocument, [])
                });
                return;
            case 'delete':
                listener({
                    name: 'delete',
                    resumeToken: doc._id,
                    snapshot: sanitize4User(doc.fullDocument, [])
                });
                return;
        }
    }
    const appEventInst = AppEventsFactory.getInstance();
    appEventInst.sub(ConstUtil.DB_CHANGES_EVENT.concat(domain), _listener);
    return {
        close: () => {
            appEventInst.unSub(ConstUtil.DB_CHANGES_EVENT.concat(domain), _listener);
        }
    }
}

export async function findById(
    domain: string,
    queryModel: QueryModel<any>,
    getNode: GetNodeFn,
    getData: GetDataFn,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<any> {
    const returnFields = getReturnFields(queryModel as any);
    const returnFields4Db = getReturnFields4Db(queryModel as any);
    await checkPolicyInDomain(domain, writeOptions);
    queryModel = sanitizeWithOperator4Db(queryModel as any);
    queryModel.filter = sanitizeWithOperator4Db(queryModel?.filter as any);
    queryModel.return = returnFields4Db;
    const treeController = new TreeController();
    const queryTree = await treeController.query(domain, {
        _id: queryModel._id
    });
    const nodePathHash = hashOfNodePath(Object.keys(queryTree)[0]);
    const nodeId = Object.values(queryTree)[0];
    const node: Node = await getNode(nodePathHash, nodeId, options);
    if (!node) {
        return null;
    }
    const eKey = nodeId?.value;
    const data = await getData(domain, eKey, options);
    return sanitize4User(data, returnFields);
}

export async function findByFilter(
    domain: string,
    queryModel: QueryModel<any>,
    purgeNodeValue: PurgeNodeValueFn,
    getNodes: GetNodesFn<Node>,
    getNode: GetNodeFn,
    getData: GetDataFn,
    security: SecurityController,
    context: ContextBlock,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<any> {
    const returnFields = getReturnFields(queryModel as any);
    const returnFields4Db = getReturnFields4Db(queryModel as any);
    await checkPolicyInDomain(domain, writeOptions);
    queryModel = sanitizeWithOperator4Db(queryModel as any);
    queryModel.filter = sanitizeWithOperator4Db(queryModel?.filter ? queryModel.filter : {});
    queryModel.return = returnFields4Db;
    let nodesToQueryData;
    try {
        const treeController = new TreeController();
        nodesToQueryData = await treeController.query(domain, queryModel.filter);
    } catch (e) {
        console.log(e);
        return [];
    }
    let result;
    if (Array.isArray(nodesToQueryData)) {
        const resultMap = {};
        for (const nQuery of nodesToQueryData) {
            const r = await handleQueryObjectTree(
                nQuery,
                domain,
                queryModel,
                purgeNodeValue,
                getNodes,
                getNode,
                getData,
                options
            );
            Array.isArray(r) ? (r.forEach(_r1 => {
                resultMap[_r1._id] = _r1
            })) : resultMap[security.generateUUID()] = r;
        }
        const _result1: any[] = Object.values(resultMap);
        result = queryModel?.count ? _result1.reduce((a, b) => a + b, 0) : _result1;
    } else {
        result = await handleQueryObjectTree(
            nodesToQueryData,
            domain,
            queryModel,
            purgeNodeValue,
            getNodes,
            getNode,
            getData,
            options
        );
    }
    if (result && Array.isArray(result)) {
        return result.map(v => sanitize4User(v, returnFields));
    }
    return result;
}

export function addUpdateMetadata(data: any, context?: ContextBlock): any {
    if (data && typeof data !== 'boolean') {
        if (data.$set) {
            data.$set.updatedAt = data.$set.updatedAt ? data.$set.updatedAt : new Date();
        } else if (data.$inc) {
            data.$set = {};
            data.$set.updatedAt = new Date();
        }
        return data;
    }
    return data;
}

export function validDomain(domain: string): boolean {
    return (domain !== '_User' && domain !== '_Token' && domain !== '_Policy');
}

export function addCreateMetadata(data: any, security: SecurityController, context: ContextBlock) {
    data.createdBy = context?.uid;
    data.createdAt = data && data.createdAt ? data.createdAt : new Date().toISOString();
    data.updatedAt = data && data.updatedAt ? data.updatedAt : new Date().toISOString();
    if (data._id) {
        return data;
    }
    data._id = data && data.id ? data.id : security.generateUUID();
    delete data.id;
    return data;
}

export function getReturnFields(data: any): any {
    if (data && data.return && Array.isArray(data.return)) {
        let flag = true;
        if (data.return.length > 0) {
            data.return.forEach(value => {
                if (typeof value !== 'string') {
                    flag = false;
                }
            });
        }
        if (flag === true) {
            return data.return;
        } else {
            return undefined;
        }
    } else {
        return undefined;
    }
}

export function getReturnFields4Db(data: any): any {
    if (data && data.return && Array.isArray(data.return)) {
        let flag = true;
        if (data.return.length > 0) {
            data.return.forEach((value, index) => {
                if (typeof value !== 'string') {
                    flag = false;
                }
                data.return[index] = Object.keys(sanitize4Db({[value]: 1}))[0];
            });
        }
        if (flag === true) {
            return data.return;
        } else {
            return undefined;
        }
    } else {
        return undefined;
    }
}

export function sanitizeWithOperator4Db(data: any) {
    data = sanitize4Db(data);
    if (data === null || data === undefined) {
        return null;
    }
    return data;
}

export function sanitize4Db(data: any) {
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
    return data;
}

export function sanitize4User(data: any, returnFields: string[]) {
    if (data === null || data === undefined) {
        return null;
    }
    if (data && data.hasOwnProperty('_id')) {
        data.id = data._id ? (typeof data._id === 'object' ? data._id : data._id.toString()) : '';
        delete data._id;
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
        data.createdBy = data?._created_by;
        delete data._created_by;
    }
    if (data && data.hasOwnProperty('_hashed_password')) {
        if (!data.password) {
            data.password = data._hashed_password;
        }
        delete data._hashed_password;
    }
    if (data && typeof data.hasOwnProperty('_rperm')) {
        delete data._rperm;
    }
    if (data && typeof data.hasOwnProperty('_wperm')) {
        delete data._wperm;
    }
    if (data && typeof data.hasOwnProperty('_acl')) {
        delete data._acl;
    }
    let returnedData: any = {};
    if (!returnFields && typeof returnFields !== 'boolean') {
        returnedData.id = data.id;
    } else if (returnFields && Array.isArray(returnFields) && returnFields.length === 0) {
        returnedData = data;
    } else {
        returnFields.forEach(value => {
            returnedData[value] = data[value];
        });
        returnedData.id = data.id;
        returnedData.createdAt = data.createdAt;
        returnedData.updatedAt = data.updatedAt;
    }

    if (returnedData === null || returnedData === undefined) {
        return null;
    }
    return returnedData;
}

export function publishChanges(domain: string, change: ChangesModel) {
    AppEventsFactory.getInstance().pub(ConstUtil.DB_CHANGES_EVENT.concat(domain), change);
}
