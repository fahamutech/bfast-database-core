import {FilesAdapter} from '../adapters/files.adapter';
import {pipeline} from 'stream';
import {BFastOptions} from '../bfast-option';
import {Buffer} from "buffer";
import {IpfsFactory} from "./ipfs.factory";
import {findByFilter, findById, removeDataInStore, writeOneDataInStore} from "../controllers/database.controller";
import {generateUUID} from "../controllers/security.controller";
import * as mime from "mime";
import {Storage} from "../models/storage";
import {Request, Response} from "express";
import {ReadableStream} from "stream/web";

function removeDot(name: string) {
    if (name === null || name === undefined) {
        return null;
    }
    return name.toString().replace('.', '');
}

export class IpfsStorageFactory implements FilesAdapter {
    private domain = '_Storage';

    constructor() {
    }

    canHandleFileStream = true;
    isS3 = false;

    async createFile(
        name: string, size: number, data: Buffer, contentType: string, pN: boolean, options: BFastOptions
    ): Promise<Storage<any>> {
        name = await this.validateFilename(name);
        return this._saveFile(name, size, data, contentType, pN, options);
    }

    async deleteFile(id: string, options: BFastOptions): Promise<any> {
        return await removeDataInStore(
            this.domain, {id: id}, {}, {bypassDomainVerification: true}, options
        );
    }

    async fileInfo(id: string, options: BFastOptions): Promise<Storage<any>> {
        const file: Storage<any> = await findById(
            this.domain,
            {
                id: id,
                return: []
            },
            {bypassDomainVerification: true},
            options
        );
        if (file && file.size && file.name) {
            return file;
        } else {
            throw {message: 'File info can not be determined'}
        }
    }

    async getFileLocation(id: string, configAdapter: BFastOptions): Promise<string> {
        return '/storage/' + configAdapter.applicationId + '/file/' + encodeURIComponent(id);
    }

    async handleFileStream(
        id: string, req: Request, res: Response, contentType: string, options: BFastOptions
    ): Promise<any> {
        const file: Storage<ReadableStream> = await findById(
            this.domain, {id: id, return: []}, {bypassDomainVerification: true}, options
        );
        if (file && file.cid && file.type && file.size) {
            const size = file.size;
            const range = req.headers.range;
            const parts = range.replace(/bytes=/, "").split('-');
            let start: any = parts[0];
            let end: any = parts[1];
            start = parseInt(start, 10);
            end = end ? parseInt(end, 10) : size - 1;

            if (!isNaN(start) && isNaN(end)) {
                // start = start;
                end = size - 1;
            }
            if (isNaN(start) && !isNaN(end)) {
                start = size - end;
                end = size - 1;
            }
            if (start >= size || end >= size) {
                res.writeHead(416, {
                    "Content-Range": `bytes */${size}`
                });
                return res.end();
            }
            res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${size}`,
                "Accept-Ranges": "bytes",
                "Content-Length": `${end - start + 1}`,
                "Content-Type": file.type
            });
            const ipfs = await IpfsFactory.getInstance(options);
            const buffer: ReadableStream = await ipfs.generateDataFromCid<ReadableStream>(
                file.cid, {json: false, stream: true, start: start, end: end}, options
            );
            pipeline(buffer, res, err => {
                if (err) {
                    try {
                        res.end()
                    } catch (_) {
                    }
                }
            });
        } else {
            throw 'file not found, maybe its deleted';
        }
    }

    async listFiles(
        query: { prefix: string, size: number, skip: number } = {prefix: '', size: 20, skip: 0}, options: BFastOptions
    ): Promise<any[]> {
        let r = await findByFilter(
            this.domain,
            {
                filter: {},
                return: [],
                size: query.size,
                skip: query.skip
            },
            {useMasterKey: true},
            {bypassDomainVerification: true},
            options
        );
        if (Array.isArray(r)) {
            return r.filter(x => x?.name?.toString()?.includes(query.prefix));
        } else {
            return [];
        }
    }

    validateFilename(name: string): string {
        const regx = /[^a-zA-Z0-9]/;
        return name.replace(new RegExp(regx), '');
    }

    async signedUrl(id: string, options: BFastOptions): Promise<string> {
        return this.getFileLocation(id, options);
    }

    private async _saveFile(
        name: string, size: number, data: Buffer, contentType: string, pN: boolean, options: BFastOptions
    ): Promise<Storage<any>> {
        const _obj: Storage<any> = {
            id: pN ? removeDot(name) : generateUUID(),
            name: pN ? removeDot(name + generateUUID()) : removeDot(name),
            // @ts-ignore
            extension: mime.getExtension(contentType),
            type: contentType,
            cid: null,
            data: null,
            size: null,
        };
        const ipfs = await IpfsFactory.getInstance(options);
        const dataRes = await ipfs.generateCidFromData(_obj, data, this.domain, options);
        _obj.cid = dataRes.cid;
        _obj.size = size;
        // @ts-ignore
        _obj.return = [];
        const wOptions = {bypassDomainVerification: true}
        return await writeOneDataInStore(
            this.domain, _obj, {}, wOptions, options
        );
    }

    async init(options: BFastOptions): Promise<void> {
        // await this.ipfsFactory.ensureIpfs(options);
    }

    async getFileBuffer(file: Storage<any>, options: BFastOptions): Promise<Buffer> {
        // let file: Storage<Buffer> = await findById(
        //     this.domain, {id: id, return: []}, {bypassDomainVerification: true}, options
        // );
        if (file && file.cid) {
            const ipfs = await IpfsFactory.getInstance(options);
            return await ipfs.generateDataFromCid<Buffer>(
                file.cid, {json: false, stream: false}, options
            );
        } else {
            throw 'file not found, maybe its deleted';
        }
    }

    async getFileStream(file: Storage<any>, options: BFastOptions): Promise<ReadableStream> {
        if (file && file.cid) {
            const ipfs = await IpfsFactory.getInstance(options);
            return await ipfs.generateDataFromCid<ReadableStream>(
                file.cid, {json: false, stream: true}, options
            );
        } else {
            throw 'file not found, maybe its deleted';
        }
    }
}
