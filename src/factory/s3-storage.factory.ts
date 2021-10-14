import {FilesAdapter} from '../adapters/files.adapter';
import {BFastOptions} from '../bfast-database.option';
import * as Minio from 'minio';
import {Client} from 'minio';
import {Buffer} from "buffer";
import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn, PurgeNodeFn,
    UpsertDataFn,
    UpsertNodeFn
} from "../adapters/database.adapter";

const url = require('url');

export class S3StorageFactory implements FilesAdapter {

    constructor() {
    }

    s3: Client;
    canHandleFileStream = false;
    isS3 = true;

    async createFile(
        name: string,
        size: number,
        data: Buffer,
        contentType: string,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        options: BFastOptions
    ): Promise<string> {
        const bucket = options?.adapters?.s3Storage?.bucket;
        await this.createBucket(bucket, options);
        await this.validateFilename(name);
        return this.saveFile(
            name,
            data,
            bucket,
            options
        );
    }

    async deleteFile(
        filename: string,
        purgeNode: PurgeNodeFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getData: GetDataFn,
        options: BFastOptions
    ): Promise<any> {
        const bucket = options?.adapters?.s3Storage?.bucket;
        await this.createBucket(bucket, options);
        return this.s3.removeObject(bucket, filename);
    }

    async fileInfo(
        name: string,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions,
    ): Promise<{ name: string; size: number }> {
        const bucket = options?.adapters?.s3Storage?.bucket;
        await this.createBucket(bucket, options);
        const stats = await this.s3.statObject(bucket, name);
        return {
            size: stats.size,
            name: name
        }
    }

    async getFileData(
        name: string,
        asStream,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions
    ): Promise<any> {
        const bucket = options?.adapters?.s3Storage?.bucket;
        await this.createBucket(bucket, options);
        return this.s3.getObject(bucket, name);
    }

    async getFileLocation(filename: string, configAdapter: BFastOptions): Promise<string> {
        return '/storage/' + configAdapter.applicationId + '/file/' + encodeURIComponent(filename);
    }

    async validateFilename(filename: string): Promise<any> {
        if (filename.length > 128) {
            throw new Error('Filename too long.');
        }

        const regx = /^[_a-zA-Z0-9][a-zA-Z0-9@. ~_-]*$/;
        if (!filename.match(regx)) {
            throw new Error('Filename contains invalid characters.');
        }
        return null;
    }

    handleFileStream(
        name: string,
        req: any,
        res: any,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        contentType,
        options: BFastOptions
    ): any {
        return this.signedUrl(name, options);
    }

    async signedUrl(filename: string, options: BFastOptions): Promise<string> {
        const bucket = options?.adapters?.s3Storage?.bucket;
        await this.createBucket(bucket, options);
        return this.s3.presignedGetObject(bucket, filename, 2 * 60 * 60);
    }

    async listFiles(
        query: { prefix: string, size: number, after: string } = {
            prefix: '',
            after: undefined,
            size: 20
        },
        purgeNode: PurgeNodeFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions
    ): Promise<any> {
        const bucket = options?.adapters?.s3Storage?.bucket;
        await this.createBucket(bucket, options);
        const listStream = this.s3.listObjectsV2(bucket, query.prefix, true, query.after);
        const files = [];
        return new Promise((resolve, _) => {
            try {
                listStream.on('data', item => {
                    if (files.length < query.size) {
                        files.push(item);
                    } else {
                        listStream.destroy();
                        listStream.emit('end');
                        return;
                    }

                });
                listStream.on('end', () => {
                    resolve(files);
                });
            } catch (_) {
                console.log(_);
                resolve(files);
            }
        }).then((files: any[]) => {
            return files.sort((a, b) => {
                if (a.lastModified.toString() > b.lastModified.toString()) {
                    return 1;
                } else if (a.lastModified.toString() < b.lastModified.toString()) {
                    return -1;
                } else {
                    return 0;
                }
            });
        });
    }

    async init(options: BFastOptions): Promise<void> {
        const endPoint = options.adapters.s3Storage.endPoint;
        const accessKey = options.adapters.s3Storage.accessKey;
        const secretKey = options.adapters.s3Storage.secretKey;
        const bucket = options.adapters.s3Storage.bucket;
        // Needs the required() check for `endPoint` to have run
        const ep = new url.URL(endPoint);
        const {useSSL = ep.protocol === 'https:'} = options.adapters.s3Storage;

        // Needs `useSSL`, whether it's provided or defaulted
        const {port = ep.port ? +ep.port : (useSSL ? 443 : 80)} = options.adapters.s3Storage;
        const region = S3StorageFactory.getRegion(endPoint, options.adapters.s3Storage.region).trim();
        Object.assign(this, {endPoint, region: `${region}`});
        Object.assign(this, {
            bucket: typeof bucket === 'function'
                ? bucket : () => {
                    return `${bucket}`;
                }
        });
        this.s3 = new Minio.Client({
            region,
            endPoint: ep.hostname, accessKey, secretKey, useSSL, port
        });
    }

    private async saveFile(
        filename: string, data: Buffer,
        bucket: string,
        options: BFastOptions
    ): Promise<string> {
        await this.createBucket(bucket, options);
        await this.s3.putObject(bucket, filename, data);
        return filename;
    }

    private static getRegion(endpoint, region = null) {
        if (region) {
            return region;
        } else if (endpoint.includes('amazonaws.')) {
            return endpoint
                .replace('https://', '')
                .replace('http://', '')
                .trim().split('.')[2];
        } else {
            return endpoint
                .replace('https://', '')
                .replace('http://', '')
                .trim().split('.')[0];
        }
    }

    private async createBucket(bucket, options: BFastOptions) {
        const endpoint = options.adapters.s3Storage.endPoint;
        const region = options.adapters.s3Storage.region;
        const bucketExist = await this.s3.bucketExists(bucket);
        if (bucketExist === true) {
        } else {
            await this.s3.makeBucket(bucket, S3StorageFactory.getRegion(endpoint, region).trim());
        }
    }
}
