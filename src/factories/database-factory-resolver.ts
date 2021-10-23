import {BFastOptions} from "../bfast-database.option";
import {Factory} from "./factory";
import {
    CreateDataFn,
    GetDataFn,
    FindDataFn,
    InitDatabaseFn,
    PurgeDataFn,
    PurgeManyDataFn,
    UpdateDataFn
} from "../adapters/database.adapter";
import {FactoryIdentifier} from "../models/factory-identifier";
import {
    createDataInStore,
    getDataInStore,
    getManyDataInStore,
    initDatabase,
    purgeDataInStore,
    purgeManyDataInStore,
    updateDataInStore,
} from "./database.factory";
import {UpdateData} from "../models/update-data";
import {Data} from "../models/data";
import {QueryModel} from "../models/query-model";
import {UpdateModel} from "../models/update-model";

// export const _getNode = async (pathHash: string, iKey, options: BFastOptions) => {
//     const userGetNode = Factory.get<GetNodeFn>(FactoryIdentifier.GetNodesFn);
//     if (userGetNode) {
//         return userGetNode(pathHash, iKey, options);
//     }
//     return getNode(pathHash, iKey, options);
// }
//
// export const _getNodes = async (pathHash: string, page: NodePage, options: BFastOptions) => {
//     const userGetNodes = Factory.get<GetNodesFn>(FactoryIdentifier.GetNodesFn);
//     if (userGetNodes) {
//         return userGetNodes(pathHash, page, options);
//     }
//     return getNodes(pathHash, page, options);
// }

export const _getData: GetDataFn = async (table: string, eKey: string, options: BFastOptions) => {
    const userGetData = Factory.get<GetDataFn>(FactoryIdentifier.GetDataFn);
    if (userGetData) {
        return userGetData(table, eKey, options);
    }
    return getDataInStore(table, eKey, options);
}

export const _getManyData: FindDataFn = async (table: string, query: QueryModel<Data>, options: BFastOptions) => {
    const userGetManyData = Factory.get<FindDataFn>(FactoryIdentifier.GetManyDataFn);
    if (userGetManyData) {
        return userGetManyData(table, query, options);
    }
    return getManyDataInStore(table, query, options);
}
//
// export const _purgeNode: PurgeNodeFn = async (path: string, query: NodeValueDeleteQuery, options: BFastOptions) => {
//     const uPn = Factory.get<PurgeNodeFn>(FactoryIdentifier.PurgeNodeFn);
//     if (uPn) {
//         return uPn(path, query, options);
//     }
//     return purgeNode(path, query, options);
// }

// export const _upsertNode: UpsertNodeFn = async (path, node, options) => {
//     const uUn = Factory.get<UpsertNodeFn>(FactoryIdentifier.UpsertNodeFn);
//     if (uUn) {
//         return uUn(path, node, options);
//     }
//     return upsertNode(path, node, options);
// }

export const _createData: CreateDataFn = async (table, data, options) => {
    const uUd = Factory.get<CreateDataFn>(FactoryIdentifier.CreateDataFn);
    if (uUd) {
        return uUd(table, data, options);
    }
    return createDataInStore(table, data, options);
}

// export const _createManyData: CreateManyDataFn = async (table, datas, options) => {
//     const uCd = Factory.get<CreateManyDataFn>(FactoryIdentifier.CreateManyData);
//     if (uCd) {
//         return uCd(table, datas, options);
//     }
//     return createManyDataInStore(table, datas, options);
// }

export const _updateData: UpdateDataFn = async (
    table: string, updateModel: UpdateModel, options: BFastOptions
) => {
    const uUd = Factory.get<UpdateDataFn>(FactoryIdentifier.UpdateDataFn);
    if (uUd) {
        return uUd(table, updateModel, options);
    }
    return updateDataInStore(table, updateModel, options);
}

// export const _updateManyData: UpdateManyDataFn = async (table: string, query: Data, data: UpdateData, options: BFastOptions) => {
//     const uUd = Factory.get<UpdateManyDataFn>(FactoryIdentifier.UpdateManyDataFn);
//     if (uUd) {
//         return uUd(table, query, data, options);
//     }
//     return updateManyDataInStore(table, query, data, options);
// }

export const _purgeData: PurgeDataFn = async (table: string, id: string, options: BFastOptions) => {
    const uUd = Factory.get<PurgeDataFn>(FactoryIdentifier.PurgeDataFn);
    if (uUd) {
        return uUd(table, id, options);
    }
    return purgeDataInStore(table, id, options);
}

export const _purgeManyData: PurgeManyDataFn = async (table: string, query: Data, options: BFastOptions) => {
    const uUd = Factory.get<PurgeManyDataFn>(FactoryIdentifier.PurgeManyDataFn);
    if (uUd) {
        return uUd(table, query, options);
    }
    return purgeManyDataInStore(table, query, options);
}

export const _init: InitDatabaseFn = async options => {
    const uI = Factory.get<InitDatabaseFn>(FactoryIdentifier.InitDatabaseFn);
    if (uI) {
        return uI(options);
    }
    return initDatabase(options);
}
