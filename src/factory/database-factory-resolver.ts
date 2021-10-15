import {NodePage} from "../model/node-page";
import {BFastOptions} from "../bfast-database.option";
import {Factory} from "./index";
import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn,
    InitDatabaseFn,
    PurgeNodeFn,
    UpsertDataFn,
    UpsertNodeFn
} from "../adapters/database.adapter";
import {FactoryIdentifier} from "../model/factory-identifier";
import {
    getDataInStore,
    getNode,
    getNodes,
    initDatabase,
    purgeNode,
    upsertDataInStore,
    upsertNode
} from "./database.factory";
import {NodeValueDeleteQuery} from "../model/node-value-delete-query";

export const _getNode = async (pathHash: string, iKey, options: BFastOptions) => {
    const userGetNode = Factory.get<GetNodeFn>(FactoryIdentifier.GetNodesFn);
    if (userGetNode) {
        return userGetNode(pathHash, iKey, options);
    }
    return getNode(pathHash, iKey, options);
}

export const _getNodes = async (pathHash: string, page: NodePage, options: BFastOptions) => {
    const userGetNodes = Factory.get<GetNodesFn>(FactoryIdentifier.GetNodesFn);
    if (userGetNodes) {
        return userGetNodes(pathHash, page, options);
    }
    return getNodes(pathHash, page, options);
}

export const _getData: GetDataFn = async (table: string, eKey: string, options: BFastOptions) => {
    const userGetData = Factory.get<GetDataFn>(FactoryIdentifier.GetNodesFn);
    if (userGetData) {
        return userGetData(table, eKey, options);
    }
    return getDataInStore(table, eKey, options);
}

export const _purgeNode: PurgeNodeFn = async (path: string, query: NodeValueDeleteQuery, options: BFastOptions) => {
    const uPn = Factory.get<PurgeNodeFn>(FactoryIdentifier.PurgeNodeFn);
    if (uPn) {
        return uPn(path, query, options);
    }
    return purgeNode(path, query, options);
}

export const _upsertNode: UpsertNodeFn = async (path, node, options) => {
    const uUn = Factory.get<UpsertNodeFn>(FactoryIdentifier.UpsertNodeFn);
    if (uUn) {
        return uUn(path, node, options);
    }
    return upsertNode(path, node, options);
}

export const _upsertData: UpsertDataFn = async (table, data, options) => {
    const uUd = Factory.get<UpsertDataFn>(FactoryIdentifier.UpsertDataFn);
    if (uUd) {
        return uUd(table, data, options);
    }
    return upsertDataInStore(table, data, options);
}


export const _init: InitDatabaseFn = async options => {
    const uI = Factory.get<InitDatabaseFn>(FactoryIdentifier.InitDatabaseFn);
    if (uI) {
        return uI(options);
    }
    return initDatabase(options);
}
