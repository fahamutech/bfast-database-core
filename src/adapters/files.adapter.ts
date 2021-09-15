// @ts-ignore
import {PassThrough} from 'stream';
import {BFastDatabaseOptions} from '../bfast-database.option';
import {DatabaseAdapter} from "./database.adapter";

export abstract class FilesAdapter {

    canHandleFileStream: boolean;
    isS3: boolean;

    abstract init(options: BFastDatabaseOptions): Promise<any>;

    abstract createFile(
        filename: string,
        size: number,
        data: Buffer,
        contentType: string,
        databaseAdapter: DatabaseAdapter,
        options: BFastDatabaseOptions
    ): Promise<string>;

    abstract deleteFile(filename: string, databaseAdapter: DatabaseAdapter, options: BFastDatabaseOptions): Promise<any>;

    abstract getFileData(filename: string, asStream: boolean, databaseAdapter: DatabaseAdapter, options: BFastDatabaseOptions): Promise<{
        size: number,
        data: Buffer | ReadableStream,
        type: string
    }>;

    abstract getFileLocation(filename: string, config: BFastDatabaseOptions): Promise<string>;

    abstract handleFileStream(
        filename: any,
        request: any,
        response: any,
        contentType: any,
        databaseAdapter: DatabaseAdapter,
        options: BFastDatabaseOptions
    ): any;

    abstract signedUrl(filename: string, options: BFastDatabaseOptions): Promise<string>;

    abstract listFiles(
        query: { prefix: string, size: number, skip: number, after: string },
        databaseAdapter: DatabaseAdapter,
        options: BFastDatabaseOptions
    ): Promise<any>;

    abstract validateFilename(filename: string, options: BFastDatabaseOptions): Promise<any>;

    abstract fileInfo(filename: string, databaseAdapter: DatabaseAdapter, options: BFastDatabaseOptions): Promise<{ name: string, size: number }>;
}
