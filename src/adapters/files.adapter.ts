import {BFastOptions} from '../bfast-database.option';
import {Buffer} from "buffer";
import {Storage} from "../models/storage";
import {Request, Response} from 'express'
import {ReadableStream} from "stream/web";

export abstract class FilesAdapter {

    canHandleFileStream: boolean;
    isS3: boolean;

    abstract init(options: BFastOptions): Promise<any>;

    abstract createFile(
        name: string, size: number, data: Buffer, contentType: string, pN: boolean, options: BFastOptions
    ): Promise<Storage<any>>;

    abstract deleteFile(id: string, options: BFastOptions): Promise<{ id: string }>;

    abstract getFileBuffer(file: Storage<any>, options: BFastOptions): Promise<Buffer>;

    abstract getFileStream(file: Storage<any>, options: BFastOptions): Promise<ReadableStream>;

    abstract getFileLocation(id: string, config: BFastOptions): Promise<string>;

    abstract handleFileStream(name: string, req: Request, res: Response, contentType, options: BFastOptions): any;

    abstract signedUrl(id: string, options: BFastOptions): Promise<string>;

    abstract listFiles(
        query: { prefix: string, size: number, skip: number, after: string }, options: BFastOptions
    ): Promise<Storage<any>[]>;

    abstract validateFilename(id: string, options: BFastOptions): string;

    abstract fileInfo(name: string, options: BFastOptions): Promise<Storage<any>>;
}
