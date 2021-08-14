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
        filename: string,
        data: PassThrough,
        contentType: any,
        options: any = {}
    ): Promise<string> {
        await this.validateFilename(filename);
        // await this.initIpfs();
        // const newFilename = security.generateUUID() + '-' + filename;
        // console.log(filename,'------> filename to save');
        return this._saveFile(filename, data, contentType, options);
    }

    async deleteFile(filename: string): Promise<any> {
        // const documents = await bucket.find({filename}).toArray();
        // if (documents.length === 0) {
        //     throw new Error('FileNotFound');
        // }
        // return Promise.all(
        //     documents.map((doc) => {
        //         return bucket.delete(doc._id);
        //     })
        // );
    }

    async getFileData<T>(filename: string, asStream = false): Promise<T> {
        // const bucket = await this.getBucket('fs');
        // const files = await bucket.find({filename}).toArray();
        // if (files.length === 0) {
        //     throw new Error('FileNotFound');
        // }
        // const stream = bucket.openDownloadStreamByName(filename);
        // if (asStream === true) {
        //     return stream as any;
        // } else {
        //     stream.read();
        //     return new Promise((resolve, reject) => {
        //         const chunks = [];
        //         stream.on('data', (data) => {
        //             chunks.push(data);
        //         });
        //         stream.on('end', () => {
        //             // @ts-ignore
        //             resolve(Buffer.concat(chunks));
        //         });
        //         stream.on('error', (err) => {
        //             reject(err);
        //         });
        //     });
        // }
        return;
    }

    async getFileStream(filename): Promise<Stream> {
        // const bucket = await this.getBucket('fs');
        // return bucket.openDownloadStreamByName(filename);
        return;
    }

    async getFileLocation(filename: string, configAdapter: BFastDatabaseOptions): Promise<string> {
        return '/storage/' + configAdapter.applicationId + '/file/' + encodeURIComponent(filename);
    }

    async getMetadata(filename): Promise<any> {
        // const bucket = await this.getBucket();
        // const files = await bucket.find({filename}).toArray();
        // if (files.length === 0) {
        //     return {};
        // }
        // const {metadata} = files[0];
        // return {metadata};
    }

    async handleFileStream(filename: string, req, res, contentType): Promise<any> {
        // const bucket = await this.getBucket('fs');
        // const files = await bucket.find({filename}).toArray();
        // if (files.length === 0) {
        //     throw new Error('FileNotFound');
        // }
        // const parts = req.get('Range').replace(/bytes=/, '').split('-');
        // const partialstart = parts[0];
        // const partialend = parts[1];
        //
        // const start = parseInt(partialstart, 10);
        // const end = partialend ? parseInt(partialend, 10) : files[0].length - 1;
        //
        // res.writeHead(206, {
        //     'Accept-Ranges': 'bytes',
        //     'Content-Length': end - start + 1,
        //     'Content-Range': 'bytes ' + start + '-' + end + '/' + files[0].length,
        //     'Content-Type': contentType,
        // });
        // const stream = bucket.openDownloadStreamByName(filename);
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
    }

    async listFiles(query: { prefix: string, size: number, skip: number } = {
        prefix: '',
        size: 20,
        skip: 0
    }): Promise<any[]> {
        // const bucket = await this.getBucket();
        // return bucket.find({
        //     filename: {
        //         $regex: query.prefix, $options: 'i'
        //     }
        // }, {
        //     skip: query.skip,
        //     limit: query.size,
        // }).toArray();
        // return [];
        const r = await this.databaseFactory.query(
            '_Storage',
            {
               filter: {
                   filename: (f) => {
                       return f.toString().includes(query.prefix)
                   }
               },
                return: [],
                size: query.size,
                skip: query.skip
            },
            {}
        );
        console.log(r,'-----> list files');
        return r;
    }

    validateFilename(filename: string): Promise<void> {
        if (filename.length > 128) {
            throw new Error('Filename too long.');
        }

        const regx = /^[_a-zA-Z0-9][a-zA-Z0-9@. ~_-]*$/;
        if (!filename.match(regx)) {
            throw new Error('Filename contains invalid characters.');
        }
        return null;
    }

    async signedUrl(filename: string): Promise<string> {
        return this.getFileLocation(filename, this.config);
    }

    private async _saveFile(
        filename: string,
        data: PassThrough | any,
        contentType: string,
        options: any = {}
    ): Promise<string> {
        const _obj = {_id: filename, filename: filename, type: contentType};
        await this.databaseFactory.dataCid(_obj, data, '_Storage');
        const r = await this.databaseFactory.writeOne(
            '_Storage'
            , _obj,
            {},
            {
                bypassDomainVerification: true
            }
        );
        // console.log(r,'----> file saved');
        return filename;
    }
}
