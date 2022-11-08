import {FilesAdapter} from '../adapters/files';
import {pipeline} from 'stream';
import {BFastOptions} from '../bfast-option';
import {Buffer} from "buffer";
import {IpfsFactory} from "./ipfs";
import {
    findDataByFilterInStore,
    findDataByIdInStore,
    removeDataInStore,
    writeOneDataInStore
} from "../controllers/database";
import {generateUUID} from "../controllers/security/security";
import * as mime from "mime";
import {Storage} from "../models/storage";
import {Request, Response} from "express";
import {ReadableStream} from "stream/web";
import {databaseFactory} from "../test";

function removeDot(name: string) {
    if (name === null || name === undefined) {
        return null;
    }
    return name.toString().replace('.', '');
}

export class IpfsStorageFactory implements FilesAdapter {
    private domain = '_Storage';

    canHandleFileStream = true;
    isS3 = false;

    async createFile(
        name: string, size: number, data: Buffer, contentType: string, pN: boolean, options: BFastOptions
    ): Promise<Storage<any>> {
        name = this.validateFilename(name);
        return this._saveFile(name, size, data, contentType, pN, options);
    }

    async deleteFile(id: string, options: BFastOptions): Promise<any> {
        const wOptions = {bypassDomainVerification: true}
        return await removeDataInStore(
            this.domain, {id: id}, {}, databaseFactory(), wOptions, options
        );
    }

    async fileInfo(id: string, options: BFastOptions): Promise<Storage<any>> {
        const wOptions = {bypassDomainVerification: true}
        const rule = {id: id, return: []}
        const file: Storage<any> = await findDataByIdInStore(this.domain, rule, databaseFactory(), wOptions, options);
        if (file && file.size && file.name) return file;
        else throw {message: 'File info can not be determined'}
    }

    async getFileLocation(id: string, configAdapter: BFastOptions): Promise<string> {
        return '/storage/' + configAdapter.applicationId + '/file/' + encodeURIComponent(id);
    }

    async handleFileStream(
        id: string, req: Request, res: Response, contentType: string, options: BFastOptions
    ): Promise<any> {
        const wOptions = {bypassDomainVerification: true}
        const rule = {id: id, return: []}
        const file: Storage<ReadableStream> = await findDataByIdInStore(
            this.domain, rule, databaseFactory(), wOptions, options
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
                "Content-Type": typeof file.type === 'string'? file.type : 'application/octet-stream'
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
        } else throw 'file not found, maybe its deleted';
    }

    async listFiles(
        query: { prefix: string, size: number, skip: number } = {prefix: '', size: 20, skip: 0}, options: BFastOptions
    ): Promise<any[]> {
        const q = {
            filter: {},
            return: [],
            size: query.size,
            skip: query.skip
        }
        const context = {useMasterKey: true}
        const wOptions = {bypassDomainVerification: true}
        let r = await findDataByFilterInStore(this.domain, q , context, databaseFactory(),wOptions, options);
        if (Array.isArray(r)) return r.filter(x => x?.name?.toString()?.includes(query.prefix));
        else return [];
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
        return await writeOneDataInStore(this.domain, _obj, {},databaseFactory(), wOptions, options);
    }

    async init(options: BFastOptions): Promise<void> {
        // await this.ipfsFactory.ensureIpfs(options);
    }

    async getFileBuffer(file: Storage<any>, options: BFastOptions): Promise<Buffer> {
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
