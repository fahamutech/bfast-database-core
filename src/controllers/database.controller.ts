import {BasicAttributesModel} from '../model/basic-attributes.model';
import {ContextBlock} from '../model/rules.model';
import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn,
    InitDatabaseFn,
    PurgeNodeFn,
    UpsertDataFn,
    UpsertNodeFn
} from '../adapters/database.adapter';
import {UpdateRuleRequestModel} from '../model/update-rule-request.model';
import {DeleteModel} from '../model/delete-model';
import {QueryModel} from '../model/query-model';
import {generateUUID} from './security.controller';
import {ChangesModel} from '../model/changes.model';
import {ChangesDocModel} from "../model/changes-doc.model";
import {AppEventsFactory} from "../factory/app-events.factory";
import {ConstUtil} from "../utils/const.util";
import {BFastOptions} from "../bfast-database.option";
import {TreeController} from "bfast-database-tree";
import {createHash} from "crypto";
import {Node} from '../model/node'
import {DatabaseWriteOptions} from "../model/database-write-options";
import {DatabaseUpdateOptions} from "../model/database-update-options";
import {DatabaseBasicOptions} from "../model/database-basic-options";
import {DatabaseChangesOptions} from "../model/database-changes-options";
import {TreeQuery} from "../model/tree-query";
import {NodeValueDeleteQuery} from "../model/node-value-delete-query";

export async function getAllContentsFromTreeTable(
    domain: string,
    queryModel: QueryModel<any>,
    getNodes: GetNodesFn<Node>,
    getData: GetDataFn,
    options: BFastOptions
): Promise<any[] | number> {
    const nodePathHash = hashOfNodePath(`${domain}/_id`);
    let nodes = await getNodes(nodePathHash, null, options);
    if (nodes && Array.isArray(nodes)) {
        if (queryModel?.size && queryModel?.size > 0) {
            const skip_ = (queryModel.skip && queryModel.skip >= 1) ? queryModel.skip : 0;
            nodes = nodes.slice(skip_, (queryModel.size + skip_));
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

export async function searchNodeByExpression(
    path: string,
    nodeId: any,
    getNodes: GetNodesFn<any>,
    options,
): Promise<Node[]> {
    const pathHash = hashOfNodePath(path);
    const np: any = {};
    if (nodeId.hasOwnProperty('$orderBy')) {
        np.sort = nodeId.$orderBy;
    }
    if (nodeId.hasOwnProperty('$limit')) {
        np.limit = nodeId.$limit;
    }
    if (nodeId.hasOwnProperty('$skip')) {
        np.skip = nodeId.$skip;
    }
    const ns = await getNodes(pathHash, np, options);
    const nodes: Node[] = [];
    for (const n of ns) {
        const fn = new Function('it', nodeId.$fn);
        fn(n._id) === true ? nodes.push(n) : null
    }
    return nodes;
}

export async function searchNode(
    nodePath: string,
    nodeId: any,
    getNodes: GetNodesFn<Node>,
    getNode: GetNodeFn,
    options: BFastOptions
): Promise<Node | Array<Node>> {
    if (typeof nodeId === "object" && nodeId?.hasOwnProperty('$fn')) {
        return searchNodeByExpression(nodePath, nodeId, getNodes, options);
    } else {
        const pathHash = hashOfNodePath(nodePath);
        return getNode(pathHash, nodeId, options);
    }
}

export function internalKeys(node: Node): string[] {
    if (node && node.value && typeof node.value === "object") {
        return Object.keys(node.value);
    }
    if (node && node.value && typeof node.value === "string" && node._id) {
        return [node._id as string];
    }
    return [];
}

export async function purgeNodeInTree(
    path: string,
    query: NodeValueDeleteQuery,
    purgeNode: PurgeNodeFn,
    options: BFastOptions
): Promise<{ _id: string }> {
    const pathHash = hashOfNodePath(path);
    return purgeNode(pathHash, query, options);
}

export function purgeNodeEntry(node: Node, iKey: string): Node {
    if (!node || !node.hasOwnProperty('_id')) {
        return node;
    }
    if (!node || !node.hasOwnProperty('value')) {
        return node;
    }
    if (typeof node.value === "string") {
        return node;
    }
    if (typeof node.value === "object") {
        delete node.value[iKey];
    }
    return node;
}

export function purgeNodeEntryByTree(node_: Node, iKey: string, eKey: string, tree: any): Node {
    let node = purgeNodeEntry(node_, iKey);
    if (eKey === null || eKey === undefined) {
        return node;
    }
    if (tree === null || tree === undefined) {
        return node;
    }
    if (tree && tree.hasOwnProperty(node._id) && typeof tree[node._id] === "object" && tree[node._id][iKey] !== eKey) {
        delete node.value[iKey];
    }
    return node;
}

export function externalKey(node: Node, iKey: string): string {
    if (node === null || node === undefined) {
        return null;
    }
    if (iKey === null || iKey === undefined) {
        return null;
    }
    if (node.value === null || node.value === undefined) {
        return null;
    }
    return node.value[iKey];
}

export async function internalShake(
    path: string,
    node: Node,
    iKey: string,
    purgeNode: PurgeNodeFn,
    options: BFastOptions
): Promise<Node> {
    node = purgeNodeEntry(node, iKey);
    await purgeNodeInTree(path, {id: iKey}, purgeNode, options).catch(console.log);
    return node;
}

export async function externalShake(
    domain: string,
    path: string,
    node: Node,
    iKey: string,
    getData: GetDataFn,
    purgeNode: PurgeNodeFn,
    options: BFastOptions
): Promise<Node> {
    const eKey = externalKey(node, iKey);
    const data = await getData(domain, eKey, options);
    // console.log(data,'external shake data')
    if (data === null || data === undefined) {
        // node = purgeNodeEntryByTree(node, iKey, eKey, data);
        node = purgeNodeEntry(node, iKey);
        await purgeNodeInTree(path, {value: iKey}, purgeNode, options).catch(console.log);
        return node;
    }
    const treeController = new TreeController();
    let tree = await treeController.objectToTree(data, domain, {
        nodeHandler: null,
        nodeIdHandler: () => data?._id ? data._id : data?.id
    });
    // console.log(tree);
    const pathParts = path.split('/');
    for (const pathPart of pathParts) {
        if (pathPart !== domain) {
            tree = tree[pathPart];
            // console.log(pathPart,'pathPart');
            // console.log(tree,'tree');
            if (tree === null || tree === undefined) {
                node = purgeNodeEntryByTree(node, iKey, eKey, tree);
                await purgeNodeInTree(path, {value: iKey}, purgeNode, options).catch(console.log);
            }
        }
    }
    return node;
}

export async function shakeTree(
    node: Node,
    nodePath: string,
    domain: string,
    purgeNode: PurgeNodeFn,
    getNode: GetNodeFn,
    getData: GetDataFn,
    options: BFastOptions
): Promise<Node> {
    const iKeys = internalKeys(node);
    // console.log(iKeys,'internalKeys');
    for (const iKey of iKeys) {
        const mainNodePathHash = hashOfNodePath(`${domain}/_id`);
        const idNode: Node = await getNode(mainNodePathHash, iKey, options);
        // console.log(idNode,'i node');
        if (idNode === null || idNode === undefined) {
            node = await internalShake(nodePath, node, iKey, purgeNode, options);
        } else {
            node = await externalShake(domain, nodePath, node, iKey, getData, purgeNode, options);
        }
    }
    return node;
}

export async function externalKeysFromNodes(
    node: Node,
    domain: string,
    nodePath: string,
    purgeNode: PurgeNodeFn,
    getNode: GetNodeFn,
    getData: GetDataFn,
    options: BFastOptions
): Promise<{ externalKeyList: Array<string>, externalKeyMap: any }> {
    const externalKeyList = [];
    const externalKeyMap = {};
    if (node && node.value) {
        if (typeof node.value === "object") {
            node = await shakeTree(node, nodePath, domain, purgeNode, getNode, getData, options);
            // console.log(node,'node after shake')
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
    nodePathnodeIdMap: TreeQuery,
    nodePathList: Array<string>,
    domain: string,
    purgeNode: PurgeNodeFn,
    getData: GetDataFn,
    getNodes: GetNodesFn<Node>,
    getNode: GetNodeFn,
    options: BFastOptions
): Promise<string[]> {
    let externalKeyList = [];
    let externalKeyMap = {};
    for (const nodePath of nodePathList) {
        const nodeId = nodePathnodeIdMap[nodePath];
        let node: Node | Array<Node> = await searchNode(nodePath, nodeId, getNodes, getNode, options);
        // console.log(node, 'node search result');
        if (Array.isArray(node)) {
            for (const n of node) {
                const r = await externalKeysFromNodes(n, domain, nodePath, purgeNode, getNode, getData, options);
                externalKeyList.push(...r.externalKeyList);
                externalKeyMap = Object.assign(externalKeyMap, r.externalKeyMap);
            }
        } else {
            const r = await externalKeysFromNodes(node, domain, nodePath, purgeNode, getNode, getData, options);
            // console.log(r,'externalKeysFromNodes');
            externalKeyList.push(...r.externalKeyList);
            externalKeyMap = Object.assign(externalKeyMap, r.externalKeyMap);
        }
    }
    externalKeyList = externalKeyList
        .filter(x => externalKeyMap[x] === nodePathList.length)
        .reduce((a, b) => a.add(b), new Set());
    externalKeyList = Array.from(externalKeyList);
    return externalKeyList;
}

export async function handleQueryObjectTree(
    treeQuery: TreeQuery,
    domain: string,
    queryModel: QueryModel<any>,
    purgerNode: PurgeNodeFn,
    getNodes: GetNodesFn<Node>,
    getNode: GetNodeFn,
    getData: GetDataFn,
    options: BFastOptions
): Promise<any[] | number> {
    const nodesPathList = Object.keys(treeQuery);
    if (nodesPathList.length === 0) {
        return getAllContentsFromTreeTable(domain, queryModel, getNodes, getData, options);
    }
    let externalKeys = await searchExternalKeysFromTree(treeQuery, nodesPathList, domain, purgerNode, getData,
        getNodes,
        getNode,
        options
    );
    // console.log(externalKeys, 'external keys');
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
    // console.log('Before hash ---> ', nodePath);
    // const l = nodePath.match(new RegExp('[0-9a-f]{40}', 'ig'));
    // if (Array.isArray(l) && l?.length > 0) {
    //     console.log('Its already hashed -----> ', nodePath);
    //     return nodePath;
    // }
    return createHash('sha1').update(nodePath.toString().trim()).digest('hex');
}

export function whenWantToSaveADataNodeToATree(eKey: string, upsertNode: UpsertNodeFn<any>, options: BFastOptions) {
    return {
        nodeHandler: async ({path, node}) => {
            for (const key of Object.keys(node)) {
                let $setMap: Node = {
                    _id: isNaN(Number(key)) ? key.trim() : Number(key),
                    value: node[key]
                };
                if (typeof node[key] === "object") {
                    $setMap = Object.keys(node[key]).reduce((a: Node, b) => {
                        a.value[b] = node[key][b];
                        return a;
                    }, {_id: isNaN(Number(key)) ? key.trim() : Number(key), value: {}});
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
    context: ContextBlock,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<T> {
    await checkPolicyInDomain(domain, writeOptions);
    const returnFields = getReturnFields(data);
    const sanitizedDataWithCreateMetadata = addCreateMetadata(data, context);
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
    context: ContextBlock,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<any[]> {
    const dP = data
        .map(d => writeOne(domain, d, cids, upsertNode, upsertData, context, writeOptions, options));
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
    context: ContextBlock,
    updateOptions: DatabaseUpdateOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<any> {
    await checkPolicyInDomain(domain, updateOptions);
    if (updateModel.upsert === true) {
        if (!updateModel.update.hasOwnProperty('$set')) {
            updateModel.update.$set = {id: generateUUID()}
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
        context, updateOptions, options);
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

export async function searchInternalKeysFromTree(
    nodePathnodeIdMap: Map<string, string>,
    nodePathList: Array<string>,
    domain: string,
    purgeNode: PurgeNodeFn,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getData: GetDataFn,
    options: BFastOptions
): Promise<string[]> {
    let internalKeyList = [];
    let internalKeyMap = new Map();
    for (const nodePath of nodePathList) {
        const nodeId = nodePathnodeIdMap[nodePath];
        let node: Node | Array<Node> = await searchNode(nodePath, nodeId, getNodes, getNode, options);
        if (Array.isArray(node)) {
            for (const n of node) {
                const r = await extractInternalKeysFromNodes(n, domain, nodePath, purgeNode, getNode, getData, options);
                internalKeyList.push(...r.internalKeyList);
                internalKeyMap = Object.assign(internalKeyMap, r.internalKeyMap);
            }
        } else {
            const r = await extractInternalKeysFromNodes(node, domain, nodePath, purgeNode, getNode, getData, options);
            internalKeyList.push(...r.internalKeyList);
            internalKeyMap = Object.assign(internalKeyMap, r.internalKeyMap);
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
    purgeNode: PurgeNodeFn,
    getNode: GetNodeFn,
    getData: GetDataFn,
    options: BFastOptions
): Promise<{ internalKeyList: Array<string>, internalKeyMap: any }> {
    const internalKeyList: Array<string> = [];
    const internalKeyMap = {};
    if (node && node.value) {
        if (typeof node.value === "object") {
            node = await shakeTree(node, nodePath, domain, purgeNode, getNode, getData, options);
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
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getData: GetDataFn,
    purgeNode: PurgeNodeFn,
    options: BFastOptions
): Promise<{ _id: string }[]> {
    const nodePathList = Object.keys(nodePathnodeIdMap);
    let internalKeyList = await searchInternalKeysFromTree(nodePathnodeIdMap, nodePathList, domain, purgeNode,
        getNodes,
        getNode,
        getData,
        options
    );
    const pathHash = hashOfNodePath(`${domain}/_id`);
    return Promise.all(
        internalKeyList.map(async iK => purgeNode(pathHash, {id: iK}, options))
    );
}

export async function remove(
    domain: string,
    deleteModel: DeleteModel<any>,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getData: GetDataFn,
    purgeNode: PurgeNodeFn,
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
            const r = await handleDeleteObjectTree(_tree, domain, getNodes, getNode, getData,
                purgeNode, options);
            Array.isArray(r) ? result.push(...r) : result.push(r);
        }
    } else {
        result = await handleDeleteObjectTree(deleteTree, domain, getNodes, getNode, getData, purgeNode, options);
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

export async function treeQuery(domain: string, data: object): Promise<TreeQuery | TreeQuery[]> {
    try {
        const treeController = new TreeController();
        return treeController.query(domain, data);
    } catch (e) {
        console.log(e);
        return {};
    }
}

export async function handleOrQueryInTree(
    domain: string,
    queryMode: QueryModel<any>,
    purgeNode: PurgeNodeFn,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getData: GetDataFn,
    treeQuery: TreeQuery[],
    options: BFastOptions
) {
    const resultMap = {};
    for (const tQ of treeQuery) {
        const r = await handleQueryObjectTree(tQ, domain, queryMode, purgeNode, getNodes, getNode, getData, options);
        Array.isArray(r) ? (r.forEach(_r1 => {
            resultMap[_r1._id] = _r1
        })) : resultMap[generateUUID()] = r;
    }
    const _result1: any[] = Object.values(resultMap);
    return queryMode?.count ? _result1.reduce((a, b) => a + b, 0) : _result1;
}

export async function findByFilter(
    domain: string,
    queryModel: QueryModel<any>,
    purgeNode: PurgeNodeFn,
    getNodes: GetNodesFn<Node>,
    getNode: GetNodeFn,
    getData: GetDataFn,
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
    const query = await treeQuery(domain, queryModel.filter);
    let result;
    if (Array.isArray(query)) {
        result = await handleOrQueryInTree(domain, queryModel, purgeNode, getNodes, getNode, getData, query, options);
    } else {
        result = await handleQueryObjectTree(query, domain, queryModel, purgeNode, getNodes, getNode, getData, options);
    }
    if (result && Array.isArray(result)) {
        return result.map(v => sanitize4User(v, returnFields));
    }
    return [];
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

export function addCreateMetadata(data: any, context: ContextBlock) {
    data.createdBy = context?.uid;
    data.createdAt = data && data.createdAt ? data.createdAt : new Date().toISOString();
    data.updatedAt = data && data.updatedAt ? data.updatedAt : new Date().toISOString();
    if (data._id) {
        return data;
    }
    data._id = data && data.id ? data.id : generateUUID();
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
