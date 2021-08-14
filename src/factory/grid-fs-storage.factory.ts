// /**
//  * GridFSBucketAdapter
//  * Stores files in Mongo using GridStore
//  * Requires the database adapters to be based on mongo client
//  */
//
// import {Db, GridFSBucket, MongoClient} from 'mongodb';
// import {FilesAdapter} from '../adapters/files.adapter';
// import {PassThrough, Stream} from 'stream';
// import {BFastDatabaseOptions} from '../bfast-database.option';
//
// let config: BFastDatabaseOptions;
//
// export class GridFsStorageFactory implements FilesAdapter {
//
//     constructor(configAdapter: BFastDatabaseOptions,
//                 private readonly mongoDatabaseURI: string,
//                 private readonly mongoOptions = {}) {
//         config = configAdapter;
//         if (!this.mongoDatabaseURI) {
//             this.mongoDatabaseURI = config.mongoDbUri;
//         }
//         const defaultMongoOptions = {
//             useNewUrlParser: true,
//             useUnifiedTopology: true,
//         };
//         this.mongoOptions = Object.assign(defaultMongoOptions, mongoOptions);
//     }
//
//     client: MongoClient;
//     connectionPromise: Promise<Db>;
//
//     canHandleFileStream = true;
//     isS3 = false;
//
//     async connect(): Promise<Db> {
//         if (!this.connectionPromise) {
//             const client = await MongoClient.connect(this.mongoDatabaseURI, this.mongoOptions);
//             this.client = client;
//             this.connectionPromise = Promise.resolve(client.db());
//             return client.db();
//         }
//         return this.connectionPromise;
//     }
//
//     async getBucket(bucket = 'fs'): Promise<GridFSBucket> {
//         const database = await this.connect();
//         return new GridFSBucket(database, {bucketName: bucket});
//     }
//
//     async createFile(filename: string, data: PassThrough, contentType: any, options: any = {}): Promise<string> {
//         await this.validateFilename(filename);
//         // const newFilename = security.generateUUID() + '-' + filename;
//         const bucket = await this.getBucket();
//         return this._saveFile(filename, data, contentType, bucket, options);
//     }
//
//     async deleteFile(filename: string): Promise<any> {
//         const bucket = await this.getBucket();
//         const documents = await bucket.find({filename}).toArray();
//         if (documents.length === 0) {
//             throw new Error('FileNotFound');
//         }
//         return Promise.all(
//             documents.map((doc) => {
//                 return bucket.delete(doc._id);
//             })
//         );
//     }
//
//     async getFileData<T>(filename: string, asStream = false): Promise<T> {
//         const bucket = await this.getBucket('fs');
//         const files = await bucket.find({filename}).toArray();
//         if (files.length === 0) {
//             throw new Error('FileNotFound');
//         }
//         const stream = bucket.openDownloadStreamByName(filename);
//         if (asStream === true) {
//             return stream as any;
//         } else {
//             stream.read();
//             return new Promise((resolve, reject) => {
//                 const chunks = [];
//                 stream.on('data', (data) => {
//                     chunks.push(data);
//                 });
//                 stream.on('end', () => {
//                     // @ts-ignore
//                     resolve(Buffer.concat(chunks));
//                 });
//                 stream.on('error', (err) => {
//                     reject(err);
//                 });
//             });
//         }
//     }
//
//     async getFileStream(filename): Promise<Stream> {
//         const bucket = await this.getBucket('fs');
//         return bucket.openDownloadStreamByName(filename);
//     }
//
//     async getFileLocation(filename: string, configAdapter: BFastDatabaseOptions): Promise<string> {
//         return '/storage/' + configAdapter.applicationId + '/file/' + encodeURIComponent(filename);
//     }
//
//     async getMetadata(filename): Promise<any> {
//         const bucket = await this.getBucket();
//         const files = await bucket.find({filename}).toArray();
//         if (files.length === 0) {
//             return {};
//         }
//         const {metadata} = files[0];
//         return {metadata};
//     }
//
//     async handleFileStream(filename: string, req, res, contentType): Promise<any> {
//         const bucket = await this.getBucket('fs');
//         const files = await bucket.find({filename}).toArray();
//         if (files.length === 0) {
//             throw new Error('FileNotFound');
//         }
//         const parts = req.get('Range').replace(/bytes=/, '').split('-');
//         const partialstart = parts[0];
//         const partialend = parts[1];
//
//         const start = parseInt(partialstart, 10);
//         const end = partialend ? parseInt(partialend, 10) : files[0].length - 1;
//
//         res.writeHead(206, {
//             'Accept-Ranges': 'bytes',
//             'Content-Length': end - start + 1,
//             'Content-Range': 'bytes ' + start + '-' + end + '/' + files[0].length,
//             'Content-Type': contentType,
//         });
//         const stream = bucket.openDownloadStreamByName(filename);
//         // @ts-ignore
//         stream.start(start);
//         stream.on('data', (chunk) => {
//             res.write(chunk);
//         });
//         stream.on('error', () => {
//             res.sendStatus(404);
//         });
//         stream.on('end', () => {
//             res.end();
//         });
//     }
//
//     async listFiles(query: { prefix: string, size: number, skip: number } = {
//         prefix: '',
//         size: 20,
//         skip: 0
//     }): Promise<any[]> {
//         const bucket = await this.getBucket();
//         return bucket.find({
//             filename: {
//                 $regex: query.prefix, $options: 'i'
//             }
//         }, {
//             skip: query.skip,
//             limit: query.size,
//         }).toArray();
//     }
//
//     validateFilename(filename: string): Promise<void> {
//         if (filename.length > 128) {
//             throw new Error('Filename too long.');
//         }
//
//         const regx = /^[_a-zA-Z0-9][a-zA-Z0-9@. ~_-]*$/;
//         if (!filename.match(regx)) {
//             throw new Error('Filename contains invalid characters.');
//         }
//         return null;
//     }
//
//     async signedUrl(filename: string): Promise<string> {
//         return this.getFileLocation(filename, config);
//     }
//
//     // async createThumbnail(filename: string, data: Buffer, contentType: string, options: any = {}): Promise<string> {
//     //     const bucket = await this.getBucket('thumbnails');
//     //     const thumbnailBuffer = await sharp(data)
//     //         .jpeg({
//     //             quality: 50,
//     //         })
//     //         .resize({width: 100})
//     //         .toBuffer();
//     //     return this._saveFile(filename, thumbnailBuffer, contentType, bucket, options);
//     // }
//
//     private async _saveFile(filename: string, data: PassThrough | any, contentType: string, bucket: GridFSBucket, options: any = {}): Promise<string> {
//         const stream = await bucket.openUploadStream(filename, {
//             contentType,
//             metadata: options.metadata,
//         });
//         if (data.pipe) {
//             await data.pipe(stream);
//         } else {
//             await stream.write(data);
//             stream.end();
//         }
//
//         return new Promise((resolve, reject) => {
//             stream.on('finish', () => {
//                 resolve(filename);
//             });
//             stream.on('error', reject);
//         });
//     }
// }
