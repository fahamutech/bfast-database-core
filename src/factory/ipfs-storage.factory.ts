import {FilesAdapter} from '../adapters/files.adapter';
import {pipeline} from 'stream';
import {BFastOptions} from '../bfast-database.option';
import {Buffer} from "buffer";
import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn, PurgeNodeFn,
    UpsertDataFn,
    UpsertNodeFn
} from "../adapters/database.adapter";
import {IpfsFactory} from "./ipfs.factory";
import {findByFilter, findById, remove, writeOne} from "../controllers/database.controller";

export class IpfsStorageFactory implements FilesAdapter {
    private domain = '_Storage';

    constructor() {
    }

    canHandleFileStream = true;
    isS3 = false;

    async createFile(
        name: string,
        size: number,
        data: Buffer,
        contentType: string,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        options: BFastOptions
    ): Promise<string> {
        await this.validateFilename(name);
        return this._saveFile(name,
            size,
            data,
            contentType,
            upsertNode,
            upsertDataInStore,
            options
        );
    }

    async deleteFile(
        name: string,
        purgeNode: PurgeNodeFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getData: GetDataFn,
        options: BFastOptions
    ): Promise<any> {
        const r = await remove(
            this.domain,
            {id: name},
            getNodes,
            getNode,
            getData,
            purgeNode,
            {},
            {bypassDomainVerification: true},
            options
        );
        return r.map(x => IpfsStorageFactory.sanitize4User(x));
    }

    async fileInfo(
        name: string,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions,
    ): Promise<{ name: string; size: number }> {
        const fObj = IpfsStorageFactory.sanitize4Saving({
            _id: name
        });
        const file = await findById(
            this.domain,
            {
                _id: fObj._id,
                return: []
            },
            getNode,
            getDataInStore,
            {bypassDomainVerification: true},
            options
        );
        if (file && file.size && file.name) {
            return file;
        } else {
            throw {message: 'File info can not be determined'}
        }
    }

    async getFileData(
        name: string,
        asStream,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions
    ): Promise<{
        size: number,
        data: Buffer | ReadableStream,
        type: string
    }> {
        const fObj = IpfsStorageFactory.sanitize4Saving({
            _id: name
        });
        let file = await findById(
            this.domain,
            {
                _id: fObj._id,
                return: []
            },
            getNode,
            getDataInStore,
            {bypassDomainVerification: true},
            options
        );
        file = IpfsStorageFactory.sanitize4User(file);
        if (file && file.cid) {
            const ipfs = await IpfsFactory.getInstance(options);
            const data = await ipfs.generateDataFromCid(
                file.cid,
                {
                    json: false,
                    stream: asStream
                },
                options);
            return {
                data: data,
                ...file
            }
        } else {
            throw 'file not found, maybe its deleted';
        }
    }

    async getFileLocation(name: string, configAdapter: BFastOptions): Promise<string> {
        return '/storage/' + configAdapter.applicationId + '/file/' + encodeURIComponent(name);
    }

    async handleFileStream(
        name: string,
        req: any,
        res: any,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        contentType,
        options: BFastOptions
    ): Promise<any> {
        const fObj = IpfsStorageFactory.sanitize4Saving({
            _id: name
        });
        const file = await findById(
            this.domain,
            {
                id: fObj._id,
                return: []
            },
            getNode,
            getDataInStore,
            {bypassDomainVerification: true},
            options
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
            const buffer = await ipfs.generateDataFromCid(
                file.cid,
                {
                    json: false,
                    stream: true,
                    start: start,
                    end: end
                },
                options
            );
            // @ts-ignore
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
        query: { prefix: string, size: number, skip: number } = {
            prefix: '',
            size: 20,
            skip: 0
        },
        purgeNode: PurgeNodeFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions
    ): Promise<any[]> {
        let r = await findByFilter(
            this.domain,
            {
                filter: {},
                return: [],
                size: query.size,
                skip: query.skip
            },
            purgeNode,
            getNodes,
            getNode,
            getDataInStore,
            {useMasterKey: true},
            {bypassDomainVerification: true},
            options
        );
        if (Array.isArray(r)) {
            r = r.filter(x => x?.name?.toString()?.includes(query.prefix)).map(x => IpfsStorageFactory.sanitize4User(x));
            return r;
        } else {
            return [];
        }
    }

    validateFilename(name: string): Promise<void> {
        if (name.length > 128) {
            throw new Error('name too long.');
        }
        const regx = /^[_a-zA-Z0-9][a-zA-Z0-9@. ~_-]*$/;
        if (!name.match(regx)) {
            throw new Error('Filename contains invalid characters.');
        }
        return null;
    }

    async signedUrl(name: string, options: BFastOptions): Promise<string> {
        return this.getFileLocation(name, options);
    }

    private async _saveFile(
        name: string,
        size: number,
        data: Buffer,
        contentType: string,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        options: BFastOptions
    ): Promise<string> {
        const _obj = IpfsStorageFactory.sanitize4Saving({
            _id: name,
            name: name,
            type: contentType,
            cid: null
        });
        const ipfs = await IpfsFactory.getInstance(options);
        const dataRes = await ipfs.generateCidFromData(_obj, data, this.domain, options);
        _obj.cid = dataRes.cid;
        _obj.size = size;
        IpfsStorageFactory.sanitize4User(await writeOne(
            this.domain,
            _obj,
            false,
            upsertNode,
            upsertDataInStore,
            {},
            {bypassDomainVerification: true},
            options
        ));
        return name;
    }

    private static sanitize4Saving(data: { [k: string]: any }) {
        if (data && JSON.stringify(data).startsWith('{')) {
            data._id = data?._id?.replace('.', '%')?.concat('-id');
            data.id = data?.id?.replace('.', '%')?.concat('-id');
            data.name = data?.name?.replace('.', '%');
        }
        return data;
    }

    private static sanitize4User(x: { [k: string]: any }) {
        if (x && JSON.stringify(x).startsWith('{')) {
            x._id = x?._id?.replace(new RegExp('%', 'ig'), '.')?.replace(new RegExp('-id', 'ig'), '');
            x.name = x?.name?.replace(new RegExp('%', 'ig'), '.');
        }
        return x;
    }

    async init(options: BFastOptions): Promise<void> {
        // await this.ipfsFactory.ensureIpfs(options);
    }
}
