import {BFastOptions} from "../bfast-option";
import {Data} from "../models/data";
import {QueryModel} from "../models/query-model";
import {UpdateModel} from "../models/update-model";

export abstract class DatabaseAdapter {
    abstract init(options: BFastOptions): Promise<any>

    abstract removeOneData(table: string, id: string, options: BFastOptions): Promise<{ _id: string }>

    abstract removeManyData(table: string, query: Data, options: BFastOptions): Promise<{ _id: string }[]>

    abstract getOneData(table: string, id: string, options: BFastOptions): Promise<any>

    abstract getManyData(table: string, query: QueryModel<Data>, options: BFastOptions): Promise<Data[]>

    abstract createOneData(table: string, data: Data, options: BFastOptions): Promise<Data>

    abstract createManyData(table: string, data: Data[], options: BFastOptions): Promise<Data[]>

    abstract updateOneData(table: string, updateModel: UpdateModel, options: BFastOptions): Promise<{ modified: number }>

    abstract updateManyData(table: string, updateModel: UpdateModel[], options: BFastOptions): Promise<{ modified: number }>

    abstract aggregateData(table: string, pipelines: any[], options: BFastOptions): Promise<any>

    abstract session<T>(): Promise<T>
}
