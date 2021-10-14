import {BFastOptions} from "../bfast-database.option";
import {Data} from "../model/data";
import {Node} from "../model/node";
import {Cursor} from "../model/cursor";
import {NodeValueDeleteQuery} from "../model/node-value-delete-query";
import {NodePage} from "../model/node-page";

export type InitDatabaseFn = (options: BFastOptions) => Promise<any>;

// export type PurgeDataFn = (table: string, id: string, options: BFastOptions) => Promise<{ _id: string }>;
export type GetDataFn = (table: string, id: string, options: BFastOptions) => Promise<Data>;
export type UpsertDataFn<T> = (table: string, data: Data, options: BFastOptions) => Promise<T>;

export type UpsertNodeFn<T> = (path: string, node: Node, options: BFastOptions) => Promise<T>;
export type GetNodeFn = (path: string, id: string, options: BFastOptions) => Promise<Node>;
export type GetNodesFn<T> = (path: string, nodePage: NodePage, options: BFastOptions) => Promise<Node[]>;
export type PurgeNodeFn = (path: string, query: NodeValueDeleteQuery, options: BFastOptions) => Promise<{ _id: string }>;
