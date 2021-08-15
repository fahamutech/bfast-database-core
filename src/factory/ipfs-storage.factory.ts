/**
 * GridFSBucketAdapter
 * Stores files in Mongo using GridStore
 * Requires the database adapters to be based on mongo client
 */

import {MongoClient} from 'mongodb';
import {FilesAdapter} from '../adapters/files.adapter';
import {PassThrough, Stream} from 'stream';
import {BFastDatabaseOptions} from '../bfast-database.option';
import {Web3Storage} from "web3.storage";
import {DatabaseFactory} from "./database.factory";

let web3Storage: Web3Storage;

export class IpfsStorageFactory implements FilesAdapter {
    private domain = '_Storage';

    constructor(private readonly config: BFastDatabaseOptions,
                private readonly databaseFactory: DatabaseFactory,
                private readonly mongoDatabaseURI: string) {
        web3Storage = new Web3Storage({
            token: config.web3Token
        });
        if (!this.mongoDatabaseURI) {
            this.mongoDatabaseURI = this.config.mongoDbUri;
        }
    }

    client: MongoClient;
    canHandleFileStream = true;
    isS3 = false;

    async connect(): Promise<MongoClient> {
        return MongoClient.connect(this.mongoDatabaseURI);
    }

    async createFile(
        name: string,
        data: PassThrough,
        contentType: any,
        options: any = {}
    ): Promise<string> {
        await this.validateFilename(name);
        return this._saveFile(name, data, contentType, options);
    }

    async deleteFile(name: string): Promise<any> {
        const r = await this.databaseFactory.delete(
            this.domain,
            this.sanitize4Saving({_id: name}),
            {}
        );
        return r.map(x => this.sanitize4User(x));
    }

    async getFileData<T>(name: string, asStream = false): Promise<any> {
        const fObj = this.sanitize4Saving({
            _id: name
        });
        const file = await this.databaseFactory.findOne(
            this.domain,
            {
                _id: fObj._id,
                return: []
            },
            {}
        );
        if (file && file.cid) {
            return this.databaseFactory.getDataFromCid(file.cid, {
                json: false
            });
        } else {
            throw 'file not found, maybe its deleted';
        }
    }

    async getFileLocation(name: string, configAdapter: BFastDatabaseOptions): Promise<string> {
        return '/storage/' + configAdapter.applicationId + '/file/' + encodeURIComponent(name);
    }

    async handleFileStream(name: string, req, res, contentType): Promise<any> {
        console.log(name,'--------> time to stream the file');
        const fObj = this.sanitize4Saving({
            _id: name
        });
        const file = await this.databaseFactory.findOne(
            this.domain,
            {
                _id: fObj._id,
                return: []
            },
            {}
        );
        if (file && file.cid) {
            // const bucket = await this.getBucket('fs');
            // const files = await bucket.find({name}).toArray();
            // if (files.length === 0) {
            //     throw new Error('FileNotFound');
            // }
            // const files = [[]];

            const parts = req.get('Range').replace(/bytes=/, '').split('-');
            const partialStart = parts[0];
            const partialEnd = parts[1];

            const start = parseInt(partialStart, 10);
            const end = partialEnd ? parseInt(partialEnd, 10) : file.size - 1;

            res.writeHead(206, {
                'Accept-Ranges': 'bytes',
                'Content-Length': end - start + 1,
                'Content-Range': 'bytes ' + start + '-' + end + '/' + file.size,
                'Content-Type': contentType,
            });
            const buffer = await this.databaseFactory.getDataFromCid(file.cid, {
                json: false,
                start: start,
                end: end
            });
            res.write(buffer);
            // const stream = bucket.openDownloadStreamByName(name);
            // // @ts-ignore
            // stream.start(start);
            // stream.on('data', (chunk) => {
            //     res.write(chunk);
            // });
            // stream.on('error', () => {
            //     res.sendStatus(404);
            // });
            // stream.on('end', () => {
            //     res.end();
            // });
        } else {
            throw 'file not found, maybe its deleted';
        }
    }

    async listFiles(query: { prefix: string, size: number, skip: number } = {
        prefix: '',
        size: 20,
        skip: 0
    }): Promise<any[]> {
        let r = await this.databaseFactory.findMany(
            this.domain,
            {
                filter: {
                    name: function (f) {
                        return !!f.includes(query.prefix);
                    }
                },
                return: [],
                size: query.size,
                skip: query.skip
            },
            {}
        );
        if (Array.isArray(r)) {
            r = r.map(x => this.sanitize4User(x));
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

    async signedUrl(name: string): Promise<string> {
        return this.getFileLocation(name, this.config);
    }

    private async _saveFile(
        name: string,
        data: PassThrough | any,
        contentType: string,
        options: any = {}
    ): Promise<string> {
        const _obj = this.sanitize4Saving({
            _id: name,
            name: name,
            type: contentType,
            cid: null
        });
        const dataRes = await this.databaseFactory.dataCid(_obj, data, this.domain);
        _obj.cid = dataRes.cid.toString();
        _obj.size = dataRes.size;
        this.sanitize4User(await this.databaseFactory.writeOne(
            this.domain,
            _obj,
            {},
            {
                bypassDomainVerification: true
            }
        ));
        // console.log(r, '----------> file saved');
        return name;
    }

    private sanitize4Saving(data: { [k: string]: any }) {
        if (data && JSON.stringify(data).startsWith('{')) {
            data._id = data?._id?.replace('.', '%')?.concat('-id');
            data.name = data?.name?.replace('.', '%');
        }
        return data;
    }

    private sanitize4User(x: { [k: string]: any }) {
        if (x && JSON.stringify(x).startsWith('{')) {
            x._id = x?._id?.replace(new RegExp('%', 'ig'), '.')?.replace(new RegExp('-id', 'ig'), '');
            x.name = x?.name?.replace(new RegExp('%', 'ig'), '.');
        }
        return x;
    }
}
