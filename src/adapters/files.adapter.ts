import {BFastOptions} from '../bfast-database.option';
import {GetDataFn, GetNodeFn, GetNodesFn, PurgeNodeFn, UpsertDataFn, UpsertNodeFn} from "./database.adapter";
import {Buffer} from "buffer";

export abstract class FilesAdapter {

    canHandleFileStream: boolean;
    isS3: boolean;

    abstract init(options: BFastOptions): Promise<any>;

    abstract createFile(
        name: string,
        size: number,
        data: Buffer,
        contentType: string,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        options: BFastOptions
    ): Promise<string>;

    abstract deleteFile(
        filename: string,
        purgeNode: PurgeNodeFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getData: GetDataFn,
        options: BFastOptions
    ): Promise<any>;

    abstract getFileData(
        name: string,
        asStream,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions
    ): Promise<{
        size: number,
        data: Buffer | ReadableStream,
        type: string
    }>;

    abstract getFileLocation(filename: string, config: BFastOptions): Promise<string>;

    abstract handleFileStream(
        name: string,
        req: any,
        res: any,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        contentType,
        options: BFastOptions
    ): any;

    abstract signedUrl(filename: string, options: BFastOptions): Promise<string>;

    abstract listFiles(
        query: { prefix: string, size: number, skip: number, after: string },
        purgeNode: PurgeNodeFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions
    ): Promise<any>;

    abstract validateFilename(filename: string, options: BFastOptions): Promise<any>;

    abstract fileInfo(
        name: string,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions,
    ): Promise<{ name: string, size: number }>;
}
