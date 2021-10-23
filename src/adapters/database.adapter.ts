import {BFastOptions} from "../bfast-database.option";
import {Data} from "../models/data";
import {QueryModel} from "../models/query-model";
import {UpdateModel} from "../models/update-model";

export type InitDatabaseFn = (options: BFastOptions) => Promise<any>;

export type PurgeDataFn = (table: string, id: string, options: BFastOptions) => Promise<{ _id: string }>;
export type PurgeManyDataFn = (table: string, query: Data, options: BFastOptions) => Promise<{ _id: string }[]>;
export type GetDataFn = (table: string, id: string, options: BFastOptions) => Promise<Data>;
export type FindDataFn = (table: string, query: QueryModel<Data>, options: BFastOptions) => Promise<Data[]>;
export type CreateDataFn = (table: string, data: Data, options: BFastOptions) => Promise<Data>;
// export type CreateManyDataFn = (table: string, datas: Array<Data>, options: BFastOptions) => Promise<Data[]>;
export type UpdateDataFn = (table: string, updateModel: UpdateModel, options: BFastOptions) => Promise<Data>;
// export type UpdateManyDataFn = (table: string, query: Data, data: UpdateData, options: BFastOptions) => Promise<Data[]>;

export type AggregateDataFn = (table: string, pipelines: any[], options: BFastOptions)=>Promise<Data>;
