import {BFastOptions} from "../bfast-database.option";
import {Data} from "../model/data";
import {Node} from "../model/node";
import {Cursor} from "../model/cursor";

export type InitDatabaseFn = (options: BFastOptions) => Promise<any>;

export type UpsertDataFn<T> = (table: string, data: Data, options: BFastOptions) => Promise<T>;
export type PurgeDataFn = (table: string, id: string, options: BFastOptions) => Promise<{ _id: string }>;
export type GetDataFn = (table: string, id: string, options: BFastOptions) => Promise<Data>;

export type UpsertNodeFn<T> = (path: string, node: Node, options: BFastOptions) => Promise<T>;
export type PurgeNodeFn = (path: string, id: string, options: BFastOptions) => Promise<{ _id: string }>;
export type PurgeNodeValueFn = (path: string, iKey: string, options: BFastOptions) => Promise<{ _id: string }>;
export type GetNodeFn = (path: string, id: string, options: BFastOptions) => Promise<Node>;
export type GetNodesFn<T> = (path: string, options: BFastOptions) => Promise<Cursor<T>>;
