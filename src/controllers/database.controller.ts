import {BasicAttributesModel} from '../models/basic-attributes.model';
import {ContextBlock} from '../models/rules.model';
import {DeleteModel} from '../models/delete-model';
import {QueryModel} from '../models/query-model';
import {generateUUID} from './security.controller';
import {ChangesModel} from '../models/changes.model';
import {ChangesDocModel} from "../models/changes-doc.model";
import {AppEventsFactory} from "../factories/app-events.factory";
import {ConstUtil} from "../utils/const.util";
import {BFastOptions} from "../bfast-database.option";
import {DatabaseWriteOptions} from "../models/database-write-options";
import {DatabaseUpdateOptions} from "../models/database-update-options";
import {DatabaseBasicOptions} from "../models/database-basic-options";
import {DatabaseChangesOptions} from "../models/database-changes-options";
import {
    _aggregate,
    _createData,
    _getData,
    _getManyData,
    _init,
    _purgeData,
    _updateData
} from "../factories/database-factory-resolver";
import {UpdateModel} from "../models/update-model";

// export async function getAllContentsFromTreeTable(
//     domain: string, queryModel: QueryModel<any>, options: BFastOptions
// ): Promise<any[] | number> {
//     const nodePathHash = hashOfNodePath(`${domain}/_id`);
//     let nodes = await _getNodes(nodePathHash, null, options);
//     if (nodes && Array.isArray(nodes)) {
//         if (queryModel?.size && queryModel?.size > 0) {
//             const skip_ = (queryModel.skip && queryModel.skip >= 1) ? queryModel.skip : 0;
//             nodes = nodes.slice(skip_, (queryModel.size + skip_));
//         }
//         if (queryModel?.count === true) {
//             return nodes.length;
//         }
//         const all_p = nodes.map(x => _getData(domain, x?.value as string, options));
//         const all = await Promise.all(all_p);
//         return all.filter(b => b !== null);
//     }
//     return [];
// }

// export async function searchNodeByExpression(path: string, iKey: any, options: BFastOptions): Promise<Node[]> {
//     const pathHash = hashOfNodePath(path);
//     const np: any = {};
//     if (iKey.hasOwnProperty('$orderBy')) {
//         np.sort = iKey.$orderBy;
//     }
//     if (iKey.hasOwnProperty('$limit')) {
//         np.limit = iKey.$limit;
//     }
//     if (iKey.hasOwnProperty('$skip')) {
//         np.skip = iKey.$skip;
//     }
//     const ns = await _getNodes(pathHash, np, options);
//     const nodes: Node[] = [];
//     for (const n of ns) {
//         const fn = new Function('it', iKey.$fn);
//         fn(n._id) === true ? nodes.push(n) : null
//     }
//     return nodes;
// }

// export async function searchNode(nodePath: string, iKey: any, options: BFastOptions): Promise<Node | Array<Node>> {
//     if (typeof iKey === "object" && iKey?.hasOwnProperty('$fn')) {
//         return searchNodeByExpression(nodePath, iKey, options);
//     } else {
//         const pathHash = hashOfNodePath(nodePath);
//         return _getNode(pathHash, iKey, options);
//     }
// }

// export function internalKeys(node: Node): string[] {
//     if (node && node.value && typeof node.value === "object") {
//         return Object.keys(node.value);
//     }
//     if (node && node.value && typeof node.value === "string" && node._id) {
//         return [node._id as string];
//     }
//     return [];
// }

// export async function purgeNodeInTree(
//     path: string, query: NodeValueDeleteQuery, options: BFastOptions
// ): Promise<{ _id: string }> {
//     const pathHash = hashOfNodePath(path);
//     return _purgeNode(pathHash, query, options);
// }

// export function purgeNodeEntry(node: Node, iKey: string): Node {
//     if (!node || !node.hasOwnProperty('_id')) {
//         return node;
//     }
//     if (!node || !node.hasOwnProperty('value')) {
//         return node;
//     }
//     if (typeof node.value === "string") {
//         return node;
//     }
//     if (typeof node.value === "object") {
//         delete node.value[iKey];
//     }
//     return node;
// }

// export function purgeNodeEntryByTree(node_: Node, iKey: string, eKey: string, tree: any): Node {
//     let node = purgeNodeEntry(node_, iKey);
//     if (eKey === null || eKey === undefined) {
//         return node;
//     }
//     if (tree === null || tree === undefined) {
//         return node;
//     }
//     if (tree && tree.hasOwnProperty(node._id) && typeof tree[node._id] === "object" && tree[node._id][iKey] !== eKey) {
//         delete node.value[iKey];
//     }
//     return node;
// }

// export function externalKey(node: Node, iKey: string): string {
//     if (node === null || node === undefined) {
//         return null;
//     }
//     if (iKey === null || iKey === undefined) {
//         return null;
//     }
//     if (node.value === null || node.value === undefined) {
//         return null;
//     }
//     if (typeof node.value === "string") {
//         return node.value;
//     }
//     return node.value[iKey];
// }

// export async function internalShake(path: string, node: Node, iKey: string, options: BFastOptions): Promise<Node> {
//     node = purgeNodeEntry(node, iKey);
//     await purgeNodeInTree(path, {id: iKey}, options).catch(console.log);
//     return node;
// }

// export async function externalShake(
//     domain: string, path: string, node: Node, iKey: string, options: BFastOptions
// ): Promise<Node> {
//     const eKey = externalKey(node, iKey);
//     const data = await _getData(domain, eKey, options);
//     if (data === null || data === undefined) {
//         node = purgeNodeEntry(node, iKey);
//         await purgeNodeInTree(path, {value: iKey}, options).catch(console.log);
//         return node;
//     }
//     const treeController = new TreeController();
//     let tree = await treeController.objectToTree(data, domain, {
//         nodeHandler: null,
//         nodeIdHandler: () => data?._id ? data._id : data?.id
//     });
//     const pathParts = path.split('/');
//     const _p = pathParts.map(async pathPart => {
//         if (pathPart !== domain) {
//             tree = tree[pathPart];
//             if (tree === null || tree === undefined) {
//                 node = purgeNodeEntryByTree(node, iKey, eKey, tree);
//                 await purgeNodeInTree(path, {value: iKey}, options).catch(console.log);
//             }
//         }
//     })
//     await Promise.all(_p);
//     return node;
// }

// export async function shakeTree(node: Node, path: string, domain: string, options: BFastOptions): Promise<Node> {
//     const iKeys = internalKeys(node);
//     const _p = iKeys.map(async iKey=>{
//         const mainNodePathHash = hashOfNodePath(`${domain}/_id`);
//         const idNode: Node = await _getNode(mainNodePathHash, iKey, options);
//         if (idNode === null || idNode === undefined) {
//             node = await internalShake(path, node, iKey, options);
//         } else {
//             node = await externalShake(domain, path, node, iKey, options);
//         }
//     });
//     await Promise.all(_p);
//     return node;
// }

// export async function handleQueryObjectTree(
//     treeQuery: TreeQuery, domain: string, queryModel: QueryModel<any>, options: BFastOptions
// ): Promise<any[] | number> {
//     const pathList = Object.keys(treeQuery);
//     if (pathList.length === 0) {
//         return getAllContentsFromTreeTable(domain, queryModel, options);
//     }
//     // console.log(treeQuery);
//     let externalKeys = await queryExternalKeys(treeQuery, domain, options);
//     // console.log(externalKeys);
//     externalKeys = await compactExternalKeys(domain, externalKeys, treeQuery, options);
//     // console.log(externalKeys, 'compacted');
//     if (queryModel?.size && queryModel?.size > 0) {
//         const skip = (queryModel.skip && queryModel.skip >= 0) ? queryModel.skip : 0;
//         externalKeys = externalKeys.slice(skip, (queryModel.size + skip));
//     }
//     if (queryModel?.count === true) {
//         return externalKeys.length;
//     }
//     const all_p = externalKeys.map(x => _getData(domain, x, options));
//     const all = await Promise.all(all_p);
//     return all.filter(t => t !== null);
// }

export async function handleDomainValidation(domain: string): Promise<any> {
    if (!validDomain(domain)) {
        throw {
            message: `${domain} is not a valid domain name`
        };
    }
    return true;
}

export async function init(options: BFastOptions): Promise<any> {
    return _init(options);
}

export async function checkPolicyInDomain(domain: string, options: DatabaseWriteOptions) {
    if (options && options.bypassDomainVerification === false) {
        await handleDomainValidation(domain);
    }
}

// export function hashOfNodePath(nodePath: string): string {
//     // console.log('Before hash ---> ', nodePath);
//     // const l = nodePath.match(new RegExp('[0-9a-f]{40}', 'ig'));
//     // if (Array.isArray(l) && l?.length > 0) {
//     //     console.log('Its already hashed -----> ', nodePath);
//     //     return nodePath;
//     // }
//     return createHash('sha1').update(nodePath.toString().trim()).digest('hex');
// }

// export function whenWantToSaveADataNodeToATree(eKey: string, options: BFastOptions) {
//     return {
//         nodeHandler: async ({path, node}) => {
//             const _p: Promise<any>[] = Object.keys(node).map(async key => {
//                 let $setMap: Node = {
//                     _id: isNaN(Number(key)) ? key.trim() : Number(key),
//                     value: node[key]
//                 };
//                 if (typeof node[key] === "object") {
//                     $setMap = Object.keys(node[key]).reduce((a: Node, b) => {
//                         a.value[b] = node[key][b];
//                         return a;
//                     }, {_id: isNaN(Number(key)) ? key.trim() : Number(key), value: {}});
//                 } else {
//                     $setMap.value = node[key]
//                 }
//                 const pathHash = hashOfNodePath(path);
//                 return await _upsertNode(pathHash, $setMap, options);
//             });
//             await Promise.all(_p);
//         },
//         nodeIdHandler: async function () {
//             return eKey?.toString();
//         }
//     }
// }

export async function writeOne<T extends BasicAttributesModel>(
    domain: string,
    data: T,
    cids: boolean,
    context: ContextBlock,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<T> {
    await checkPolicyInDomain(domain, writeOptions);
    const returnFields = getReturnFields(data);
    const sanitizedDataWithCreateMetadata = addCreateMetadata(data, context);
    const sanitizedData: any = sanitize4Db(sanitizedDataWithCreateMetadata);
    // const treeController = new TreeController();
    // await treeController.objectToTree(sanitizedData, domain, whenWantToSaveADataNodeToATree(sanitizedData._id, options));
    const savedData: any = await _createData(domain, sanitizedData, options);
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
    context: ContextBlock,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<any[]> {
    const dP = data.map(d => writeOne(domain, d, cids, context, writeOptions, options));
    return Promise.all(dP);
}

// export function incrementFields(newDoc: any, ip: { [p: string]: any }) {
//     if (!newDoc) {
//         newDoc = {};
//     }
//     if (!ip) {
//         return newDoc;
//     } else {
//         for (const key of Object.keys(ip)) {
//             if (typeof ip[key] === "number") {
//                 if (newDoc.hasOwnProperty(key) && !isNaN(newDoc[key])) {
//                     newDoc[key] += ip[key];
//                 } else if (!newDoc.hasOwnProperty(key)) {
//                     newDoc[key] = ip[key];
//                 }
//             } else if (typeof ip[key] === "object" && JSON.stringify(ip[key]).startsWith('{')) {
//                 newDoc[key] = incrementFields(newDoc[key], ip[key]);
//             }
//         }
//         return newDoc;
//     }
// }

export async function updateOne(
    domain: string,
    updateModel: UpdateModel,
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
    updateModel = altUpdateModel(updateModel);
    // updateOptions.dbOptions = updateModel && updateModel.options ? updateModel.options : {};
    // const fQm = {id: updateModel.id, cids: false, return: []};
    // let oldDoc = await findById(domain, fQm, updateOptions, options);
    // if (!oldDoc && updateModel.upsert === true) {
    //     oldDoc = {id: updateModel.id};
    // }
    // if (!oldDoc) {
    //     return null;
    // }
    // const updateParts = updateModel.update.$set;
    // const incrementParts = updateModel.update.$inc;
    // let newDoc = Object.assign(oldDoc, updateParts);
    // newDoc = incrementFields(newDoc, incrementParts);
    // newDoc.return = returnFields;
    // const updateData: UpdateData = {id: updateModel.id, inc: incrementParts, set: updateParts};
    const updatedDoc = await _updateData(domain, updateModel, options);
    const cleanDoc = sanitize4User(updatedDoc, returnFields);
    publishChanges(domain, {
        _id: updatedDoc?._id,
        fullDocument: updatedDoc,
        operationType: "update"
    });
    return cleanDoc;
}

export async function updateMany(
    domain: string,
    updateModel: UpdateModel,
    context: ContextBlock,
    updateOptions: DatabaseUpdateOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<any> {
    await checkPolicyInDomain(domain, updateOptions);
    let oldDocs: any[] = await findByFilter(domain, updateModel, context, updateOptions, options);
    if (!Array.isArray(oldDocs)) {
        return [];
    }
    if (oldDocs.length === 0 && updateModel.upsert === true) {
        oldDocs = [{id: generateUUID()}];
    }
    oldDocs = oldDocs.map(old => old.id);
    oldDocs = Array.from(oldDocs.reduce((a, b) => a.add(b), new Set()));
    const _p = oldDocs.map(_id => {
        const uM = JSON.parse(JSON.stringify(updateModel));
        uM.id = _id;
        return updateOne(domain, uM, context, updateOptions, options);
    });
    const _a = await Promise.all(_p);
    return _a.filter(_a1 => _a1 !== null);
    // for (const x of oldDocs) {
    //     oldDocs[oldDocs.indexOf(x)] = await updateOne(
    //         domain,
    //         {
    //             update: updateModel.update,
    //             upsert: updateModel.upsert,
    //             id: x.id,
    //             return: []
    //         },
    //         context,
    //         updateOptions,
    //         options
    //     );
    // }
}

function altUpdateModel(updateModel: UpdateModel): UpdateModel {
    updateModel.update = sanitizeWithOperator4Db(updateModel?.update as any);
    updateModel.filter = sanitizeWithOperator4Db(updateModel?.filter as any);
    updateModel.update = addUpdateMetadata(updateModel?.update as any);
    return updateModel;
}

// export async function externalKeys(node: Node): Promise<Array<string>> {
//     const externalKeyList = [];
//     if (node && typeof node.value === "object") {
//         externalKeyList.push(...Object.values<string>(node.value));
//     }
//     if (node && typeof node.value === 'string') {
//         externalKeyList.push(node.value);
//     }
//     return externalKeyList;
// }

// export async function queryExternalKeys(
//     treeQuery: TreeQuery, domain: string, options: BFastOptions
// ): Promise<string[]> {
//     const pathList = Object.keys(treeQuery);
//     const _p: Promise<any>[] = pathList.map(async path => {
//         const nodeId = treeQuery[path];
//         let node: Node | Array<Node> = await searchNode(path, nodeId, options);
//         if (Array.isArray(node)) {
//             const _p1: Promise<string[]>[] = node.map(async _node => {
//                 _node = await shakeTree(_node, path, domain, options);
//                 return externalKeys(_node);
//             });
//             return await Promise.all(_p1);
//         } else {
//             node = await shakeTree(node, path, domain, options);
//             return externalKeys(node);
//         }
//     });
//     let eKeyList = (await Promise.all(_p));
//     return _reduceToOneLevelStringOfArray(eKeyList);
// }

// export async function compactExternalKeys(
//     table: string, eKeyList: string[], treeQuery: TreeQuery, options: BFastOptions
// ): Promise<string[]> {
//     const _p: Promise<string>[] = eKeyList.map(async eKey => {
//         const data = await _getData(table, eKey, options);
//         const fT = await verifyDataWithTreeQuery(table, treeQuery, data);
//         if (fT === true) return eKey;
//         else return null;
//     })
//     let eKL = (await Promise.all(_p)).filter(y => y !== null);
//     const eKLS = eKL.reduce((a, b) => a.add(b), new Set<string>());
//     return Array.from(eKLS);
// }

// function _reduceToOneLevelStringOfArray(v: any[]): string[] {
//     while (Array.isArray(v) && typeof v[0] === "object") {
//         v = v.reduce((a, b) => [...a, ...b], []);
//     }
//     return Array.from(v.reduce((a, b) => a.add(b), new Set()));
// }

// export async function queryInternalKeys(
//     treeQuery: TreeQuery, domain: string, options: BFastOptions
// ): Promise<string[]> {
//     const pathList = Object.keys(treeQuery);
//     const _p = pathList.map(async path => {
//         const nodeId = treeQuery[path];
//         let node: Node | Array<Node> = await searchNode(path, nodeId, options);
//
//         async function _shakeAndGetIKeys(_node1: Node) {
//             _node1 = await shakeTree(_node1, path, domain, options);
//             return internalKeys(_node1);
//         }
//
//         if (Array.isArray(node)) {
//             const _p1 = node.map(_node => _shakeAndGetIKeys(_node));
//             return await Promise.all(_p1);
//         } else {
//             return _shakeAndGetIKeys(node);
//         }
//     });
//     let iKeyList: any[] = await Promise.all(_p);
//     return _reduceToOneLevelStringOfArray(iKeyList);
// }

// export async function verifyDataWithTreeQuery(table: string, treeQuery: TreeQuery, data: Data): Promise<boolean> {
//     const treeQ = {};
//     await new TreeController().objectToTree(data, table, {
//         nodeIdHandler: () => null,
//         nodeHandler: async ({path, node}) => {
//             const v = Object.keys(node)[0];
//             treeQ[path] = isNaN(Number(v)) ? v : parseFloat(v);
//         }
//     });
//     const trues = [];
//     for (const tq of Object.keys(treeQuery)) {
//         if (typeof treeQuery[tq] === "object") {
//             const fn = new Function('it', (treeQuery[tq] as any).$fn);
//             trues.push(fn(treeQ[tq]));
//         } else if (typeof treeQuery[tq] !== "object" && treeQ[tq] === treeQuery[tq]) {
//             trues.push(true);
//         } else {
//             trues.push(false);
//         }
//     }
//     return trues.reduce((a, b) => a && b, true);
// }

// export async function compactInternalKeys(
//     table: string, iKeyList: string[], treeQuery: TreeQuery, options: BFastOptions
// ): Promise<string[]> {
//     const _p = iKeyList.map(async iKey => {
//         const mPHash = hashOfNodePath(`${table}/_id`);
//         const idNode = await _getNode(mPHash, iKey, options);
//         if (idNode && typeof idNode.value === "string") {
//             const data = await _getData(table, idNode.value, options);
//             const v = await verifyDataWithTreeQuery(table, treeQuery, data);
//             if (v === true) return iKey;
//             else return null;
//         }
//     });
//     let iKL: any[] = await Promise.all(_p);
//     iKL = iKL.filter(y => y !== null);
//     const iKLS = iKL.reduce((a, b) => a.add(b), new Set())
//     return Array.from(iKLS);
// }

// export async function handleDeleteObjectTree(
//     treeQuery: TreeQuery, domain: string, options: BFastOptions
// ): Promise<{ _id: string }[]> {
//     let iKList = await queryInternalKeys(treeQuery, domain, options);
//     // console.log(iKList);
//     iKList = await compactInternalKeys(domain, iKList, treeQuery, options);
//     // console.log(iKList, 'compacted');
//     const pathHash = hashOfNodePath(`${domain}/_id`);
//     return Promise.all(
//         iKList.map(async iK => _purgeNode(pathHash, {id: iK}, options))
//     );
// }

export async function remove(
    domain: string, deleteModel: DeleteModel<any>, context: ContextBlock,
    basicOptions: DatabaseBasicOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<any> {
    await checkPolicyInDomain(domain, basicOptions);
    deleteModel.filter = sanitizeWithOperator4Db(deleteModel?.filter as any);
    // let deleteTree;
    // try {
    //     const treeController = new TreeController();
    //     deleteTree = await treeController.query(
    //         domain,
    //         deleteModel.id ? {_id: deleteModel.id} : deleteModel.filter
    //     );
    // } catch (e) {
    //     console.log(e);
    //     return null;
    // }
    let result = [];
    if (deleteModel && deleteModel.id) {
        await _purgeData(domain, deleteModel.id, options);
        result.push({id: deleteModel.id});
    }
    if (deleteModel && deleteModel.filter) {
        let all = await findByFilter(domain, deleteModel, context, basicOptions, options);
        const _p = all.map(async a => {
            await _purgeData(domain, a.id, options);
            return {id: a.id};
        });
        const _pa = await Promise.all(_p);
        result.push(..._pa);
    }
    // if (Array.isArray(deleteTree)) {
    //     const _p = deleteTree.map(async _tree => {
    //         const r = await handleDeleteObjectTree(_tree, domain, options);
    //         Array.isArray(r) ? result.push(...r) : result.push(r);
    //     });
    //     await Promise.all(_p);
    // } else {
    //     result = await handleDeleteObjectTree(deleteTree, domain, options);
    // }

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
    domain: string, pipeline: any[], listener: (doc: ChangesDocModel) => void,
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
                    snapshot: sanitize4User(doc.fullDocument, [])
                });
                return;
            case 'update':
                listener({
                    name: 'update',
                    snapshot: sanitize4User(doc.fullDocument, [])
                });
                return;
            case 'delete':
                listener({
                    name: 'delete',
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
    domain: string, queryModel: QueryModel<any>,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<any> {
    const returnFields = getReturnFields(queryModel as any);
    const returnFields4Db = getReturnFields4Db(queryModel as any);
    await checkPolicyInDomain(domain, writeOptions);
    const id = queryModel.id;
    // queryModel = sanitizeWithOperator4Db(queryModel as any);
    // queryModel.filter = sanitizeWithOperator4Db(queryModel?.filter as any);
    queryModel.return = returnFields4Db;
    // const treeController = new TreeController();
    // const queryTree = await treeController.query(domain, {
    //     _id: queryModel._id
    // });
    // const nodePathHash = hashOfNodePath(Object.keys(queryTree)[0]);
    // const nodeId = Object.values(queryTree)[0];
    // const node: Node = await _getNode(nodePathHash, nodeId, options);
    // if (!node) {
    //     return null;
    // }
    // const eKey = externalKey(node, nodeId);
    // console.log(queryModel);
    const data = await _getData(domain, id, options);
    return sanitize4User(data, returnFields);
}

// export async function treeQuery(domain: string, data: object): Promise<TreeQuery | TreeQuery[]> {
//     try {
//         const treeController = new TreeController();
//         return treeController.query(domain, data);
//     } catch (e) {
//         console.log(e);
//         return {};
//     }
// }

// export async function handleOrQueryInTree(
//     domain: string, queryMode: QueryModel<any>, treeQuery: TreeQuery[], options: BFastOptions
// ) {
//     const resultMap = {};
//     const _p = treeQuery.map(async tQ => {
//         const r = await handleQueryObjectTree(tQ, domain, queryMode, options);
//         Array.isArray(r) ? (r.forEach(_r1 => {
//             resultMap[_r1._id] = _r1
//         })) : resultMap[generateUUID()] = r;
//     });
//     await Promise.all(_p);
//     const _result1: any[] = Object.values(resultMap);
//     return queryMode?.count ? _result1.reduce((a, b) => a + b, 0) : _result1;
// }

export async function findByFilter(
    domain: string, queryModel: QueryModel<any>, context: ContextBlock,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<any> {
    const returnFields = getReturnFields(queryModel as any);
    const returnFields4Db = getReturnFields4Db(queryModel as any);
    await checkPolicyInDomain(domain, writeOptions);
    queryModel = sanitizeWithOperator4Db(queryModel as any);
    queryModel.filter = sanitizeWithOperator4Db(queryModel?.filter ? queryModel.filter : {});
    queryModel.return = returnFields4Db;
    // const query = await treeQuery(domain, queryModel.filter);
    let result = await _getManyData(domain, queryModel, options);
    // if (Array.isArray(query)) {
    //     result = await handleOrQueryInTree(domain, queryModel, query, options);
    // } else {
    //     result = await handleQueryObjectTree(query, domain, queryModel, options);
    // }
    if (result && Array.isArray(result)) {
        return result.map(v => sanitize4User(v, returnFields));
    }
    return result;
}

export function addUpdateMetadata(data: any): any {
    if (data && typeof data !== 'boolean') {
        if (data.$set) {
            data.$set.updatedAt = data.$set.updatedAt ? data.$set.updatedAt : new Date().toISOString();
        } else if (data.$inc) {
            data.$set = {};
            data.$set.updatedAt = new Date().toISOString();
        }
        return data;
    }
    return data;
}

export function validDomain(domain: string): boolean {
    return (domain !== '_User' && domain !== '_Token' && domain !== '_Policy');
}

export function addCreateMetadata(data: any, context: ContextBlock) {
    data.createdBy = context?.uid ? context.uid : null;
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

export async function aggregate(
    table: string, pipelines: any[],
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false},
    options: BFastOptions
): Promise<any> {
    await checkPolicyInDomain(table, writeOptions);
    const results = await _aggregate(table, pipelines, options);
    return results.map(result => sanitize4User(result, []));
}
