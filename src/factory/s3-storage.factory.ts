import {FilesAdapter} from '../adapters/files.adapter';
import {BFastDatabaseConfigAdapter} from '../bfast.config';
import * as Minio from 'minio';
import {Client} from 'minio';
import {PassThrough} from 'stream';

const url = require('url');
let config: BFastDatabaseConfigAdapter;

export class S3StorageFactory implements FilesAdapter {

    constructor(configAdapter: BFastDatabaseConfigAdapter) {
        config = configAdapter;
        this.init(config);
    }

    s3: Client;

    canHandleFileStream = false;
    isS3 = true;

    async createFile(filename: string, data: PassThrough, contentType: string, options: any): Promise<string> {
        const bucket = config.adapters.s3Storage.bucket;
        await this.createBucket(bucket);
        await this.validateFilename(filename);
        // const newFilename = security.generateUUID() + '-' + filename;
        return this.saveFile(filename, data, bucket, config.adapters.s3Storage.endPoint, config.adapters.s3Storage.region);
    }

    async deleteFile(filename: string): Promise<any> {
        const bucket = config.adapters.s3Storage.bucket;
        await this.createBucket(bucket);
        return this.s3.removeObject(bucket, filename);
    }

    async getFileData(filename: string, asStream = false): Promise<any> {
        const bucket = config.adapters.s3Storage.bucket;
        await this.createBucket(bucket);
        return this.s3.getObject(bucket, filename);
    }

    async getFileLocation(filename: string, configAdapter: BFastDatabaseConfigAdapter): Promise<string> {
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

    handleFileStream(filename: any, request: any, response: any, contentType: any): any {
        return this.signedUrl(filename);
    }

    async signedUrl(filename: string): Promise<string> {
        const bucket = config.adapters.s3Storage.bucket;
        await this.createBucket(bucket);
        return this.s3.presignedGetObject(bucket, filename, 2 * 60 * 60);
    }

    async listFiles(query: { prefix: string, size: number, after: string } = {
        prefix: '',
        after: undefined,
        size: 20
    }): Promise<any> {
        const bucket = config.adapters.s3Storage.bucket;
        await this.createBucket(bucket);
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

    private init(configAdapter: BFastDatabaseConfigAdapter): void {
        const endPoint = configAdapter.adapters.s3Storage.endPoint;
        const accessKey = configAdapter.adapters.s3Storage.accessKey;
        const secretKey = configAdapter.adapters.s3Storage.secretKey;
        const bucket = configAdapter.adapters.s3Storage.bucket;
        // Needs the required() check for `endPoint` to have run
        const ep = new url.URL(endPoint);
        const {useSSL = ep.protocol === 'https:'} = config.adapters.s3Storage;

        // Needs `useSSL`, whether it's provided or defaulted
        const {port = ep.port ? +ep.port : (useSSL ? 443 : 80)} = config.adapters.s3Storage;
        const region = S3StorageFactory.getRegion(endPoint, configAdapter.adapters.s3Storage.region).trim();
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

    // async createThumbnail(filename: string, data: Buffer, contentType: string, options: Object): Promise<string> {
    //     const bucket = config.adapters.s3Storage.bucket + '-thumb';
    //     const thumbnailBuffer = await sharp(data)
    //         .jpeg({
    //             quality: 50,
    //         })
    //         .resize({width: 100})
    //         .toBuffer();
    //     return this.saveFile(filename, thumbnailBuffer, bucket, config.adapters.s3Storage.endPoint);
    // }

    private async saveFile(filename: string, data: any, bucket: string, endpoint: string, region = null): Promise<string> {
        await this.createBucket(bucket);
        // if (bucketExist === true) {
        //     await this.s3.putObject(bucket, filename, data);
        //     return filename;
        // } else {
        //     await this.s3.makeBucket(bucket, S3StorageFactory.getRegion(endpoint, region).trim());
        await this.s3.putObject(bucket, filename, data);
        return filename;
        //   }
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

    private async createBucket(bucket) {
        const endpoint = config.adapters.s3Storage.endPoint;
        const region = config.adapters.s3Storage.region;
        const bucketExist = await this.s3.bucketExists(bucket);
        if (bucketExist === true) {
        } else {
            await this.s3.makeBucket(bucket, S3StorageFactory.getRegion(endpoint, region).trim());
        }
    }
}
