import {BFastOptions} from "../bfast-database.option";
import {Factory} from "./factory";
import {
    AggregateDataFn,
    CreateDataFn,
    CreateManyDataFn,
    FindDataFn,
    GetDataFn,
    InitDatabaseFn,
    PurgeDataFn,
    PurgeManyDataFn,
    UpdateDataFn,
    UpdateManyDataFn
} from "../adapters/database.adapter";
import {FactoryIdentifier} from "../models/factory-identifier";
import {
    aggregate,
    createDataInStore,
    createManyDataInStore,
    getDataInStore,
    getManyDataInStore,
    initDatabase,
    purgeDataInStore,
    purgeManyDataInStore,
    updateDataInStore,
    updateManyDataInStore,
} from "./database.factory";
import {Data} from "../models/data";
import {QueryModel} from "../models/query-model";
import {UpdateModel} from "../models/update-model";

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

export const _createData: CreateDataFn = async (table, data, options) => {
    const uUd = Factory.get<CreateDataFn>(FactoryIdentifier.CreateDataFn);
    if (uUd) {
        return uUd(table, data, options);
    }
    return createDataInStore(table, data, options);
}

export const _createManyData: CreateManyDataFn = (table, data, options) => {
    const uUd = Factory.get<CreateManyDataFn>(FactoryIdentifier.CreateManyData);
    if (uUd) {
        return uUd(table, data, options);
    }
    return createManyDataInStore(table, data, options);
}

export const _updateDataInStore: UpdateDataFn = async (
    table: string, updateModel: UpdateModel, options: BFastOptions
) => {
    const uUd = Factory.get<UpdateDataFn>(FactoryIdentifier.UpdateDataFn);
    if (uUd) {
        return uUd(table, updateModel, options);
    }
    return updateDataInStore(table, updateModel, options);
}

export const _updateManyDataInStore: UpdateManyDataFn = async (
    table: string, updateModel: UpdateModel[], options: BFastOptions
) => {
    const uUd = Factory.get<UpdateManyDataFn>(FactoryIdentifier.UpdateManyDataFn);
    if (uUd) {
        return uUd(table, updateModel, options);
    }
    return updateManyDataInStore(table, updateModel, options);
}

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

export const _aggregate: AggregateDataFn = (table, pipelines, options) => {
    const uA = Factory.get<AggregateDataFn>(FactoryIdentifier.AggregateDataFn);
    if (uA) {
        return uA(table, pipelines, options);
    }
    return aggregate(table, pipelines, options);
}
