/**
 GridFSBucketAdapter
 Stores files in Mongo using GridStore
 Requires the database adapter to be based on mongo client
 */

import {Db, GridFSBucket, MongoClient} from 'mongodb';
import {FilesAdapter} from "../adapter/FilesAdapter";
import {BfastConfig} from "../bfast.config";
import {SecurityController} from "../controllers/security.controller";
import {PassThrough} from "stream";

// const sharp = require('sharp');

let _security: SecurityController;

export class GridFsStorage implements FilesAdapter {

    _client: MongoClient;
    _databaseURI: string;
    _connectionPromise: Promise<Db>;
    _mongoOptions: Object;

    constructor(private readonly security: SecurityController,
                private readonly config: BfastConfig,
                mongoDatabaseURI = BfastConfig.getInstance().mongoDbUri, mongoOptions = {}) {
        this._databaseURI = mongoDatabaseURI;
        _security = this.security;
        const defaultMongoOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };
        this._mongoOptions = Object.assign(defaultMongoOptions, mongoOptions);
    }

    async _connect(): Promise<Db> {
        if (!this._connectionPromise) {
            const client = await MongoClient.connect(this._databaseURI, this._mongoOptions);
            this._client = client;
            this._connectionPromise = Promise.resolve(client.db());
            return client.db();
        }
        return this._connectionPromise;
    }

    async _getBucket(bucket = 'fs'): Promise<GridFSBucket> {
        const database = await this._connect();
        return new GridFSBucket(database, {bucketName: bucket});
    }

    async createFile(filename: string, data: PassThrough, contentType: any, options: any = {}): Promise<string> {
        await this.validateFilename(filename);
        const newFilename = _security.generateUUID() + '-' + filename;
        const bucket = await this._getBucket();
        return this._saveFile(newFilename, data, contentType, bucket, options);
    }

    async deleteFile(filename: string) {
        const bucket = await this._getBucket();
        const documents = await bucket.find({filename}).toArray();
        if (documents.length === 0) {
            throw new Error('FileNotFound');
        }
        return Promise.all(
            documents.map((doc) => {
                return bucket.delete(doc._id);
            })
        );
    }

    async getFileData(filename: string, thumbnail = false): Promise<Buffer> {
        const bucket = await this._getBucket(thumbnail === true ? 'thumbnails' : 'fs');
        const stream = bucket.openDownloadStreamByName(filename);
        stream.read();
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', (data) => {
                chunks.push(data);
            });
            stream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            stream.on('error', (err) => {
                reject(err);
            });
        });
    }

    async getFileLocation(filename: string, config: BfastConfig): Promise<string> {
        return '/storage/' + config.applicationId + '/file/' + encodeURIComponent(filename);
    }

    async getMetadata(filename) {
        const bucket = await this._getBucket();
        const files = await bucket.find({filename}).toArray();
        if (files.length === 0) {
            return {};
        }
        const {metadata} = files[0];
        return {metadata};
    }

    async handleFileStream(filename: string, req, res, contentType, thumbnail = false) {
        const bucket = await this._getBucket(thumbnail === true ? 'thumbnails' : 'fs');
        const files = await bucket.find({filename}).toArray();
        if (files.length === 0) {
            throw new Error('FileNotFound');
        }
        const parts = req
            .get('Range')
            .replace(/bytes=/, '')
            .split('-');
        const partialstart = parts[0];
        const partialend = parts[1];

        const start = parseInt(partialstart, 10);
        const end = partialend ? parseInt(partialend, 10) : files[0].length - 1;

        res.writeHead(206, {
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Range': 'bytes ' + start + '-' + end + '/' + files[0].length,
            'Content-Type': contentType,
        });
        const stream = bucket.openDownloadStreamByName(filename);
        // @ts-ignore
        stream.start(start);
        stream.on('data', (chunk) => {
            res.write(chunk);
        });
        stream.on('error', () => {
            res.sendStatus(404);
        });
        stream.on('end', () => {
            res.end();
        });
    }

    canHandleFileStream = true;
    isS3 = false;

    async listFiles(query: { prefix: string, size: number, skip: number } = {
        prefix: '',
        size: 20,
        skip: 0
    }): Promise<any[]> {
        const bucket = await this._getBucket();
        return bucket.find({
            filename: {
                $regex: query.prefix, $options: 'i'
            }
        }, {
            skip: query.skip,
            limit: query.size
        }).toArray();
    }

    validateFilename(filename: string): Promise<void> {
        if (filename.length > 128) {
            throw 'Filename too long.';
        }

        const regx = /^[_a-zA-Z0-9][a-zA-Z0-9@. ~_-]*$/;
        if (!filename.match(regx)) {
            throw 'Filename contains invalid characters.';
        }
        return null;
    }

    async signedUrl(filename: string, thumbnail = false): Promise<string> {
        return this.getFileLocation(filename, this.config);
    }

    // async createThumbnail(filename: string, data: Buffer, contentType: string, options: any = {}): Promise<string> {
    //     const bucket = await this._getBucket('thumbnails');
    //     const thumbnailBuffer = await sharp(data)
    //         .jpeg({
    //             quality: 50,
    //         })
    //         .resize({width: 100})
    //         .toBuffer();
    //     return this._saveFile(filename, thumbnailBuffer, contentType, bucket, options);
    // }

    private async _saveFile(filename: string, data: any, contentType: string, bucket: GridFSBucket, options: any = {}): Promise<string> {
        const stream = await bucket.openUploadStream(filename, {
            contentType: contentType,
            metadata: options.metadata,
        });
        await stream.write(data);
        stream.end();
        return new Promise((resolve, reject) => {
            stream.on('finish', () => {
                resolve(filename);
            });
            stream.on('error', reject);
        });
    }
}
