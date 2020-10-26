import {FilesAdapter} from '../adapters/files.adapter';
import {BFastDatabaseConfigAdapter} from '../bfast.config';
import {SecurityController} from '../controllers/security.controller';
import * as Minio from 'minio';
import {Client} from 'minio';
import {PassThrough} from 'stream';

const url = require('url');

export class S3StorageFactory implements FilesAdapter {

  constructor(private readonly securityController: SecurityController,
              private readonly config: BFastDatabaseConfigAdapter) {
    this.init(config);
  }

  s3: Client;

  canHandleFileStream = false;
  isS3 = true;

  async createFile(filename: string, data: PassThrough, contentType: string, options: any): Promise<string> {
    const bucket = this.config.adapters.s3Storage.bucket;
    await this.validateFilename(filename);
    const newFilename = this.securityController.generateUUID() + '-' + filename;
    return this.saveFile(newFilename, data, bucket, this.config.adapters.s3Storage.endPoint);
  }

  deleteFile(filename: string): Promise<any> {
    const bucket = this.config.adapters.s3Storage.bucket;
    return this.s3.removeObject(bucket, filename);
  }

  getFileData(filename: string, thumbnail = false): Promise<any> {
    const bucket = thumbnail === true
      ? this.config.adapters.s3Storage.bucket + '-thumb'
      : this.config.adapters.s3Storage.bucket;
    return this.s3.getObject(bucket, filename);
  }

  async getFileLocation(filename: string, config: BFastDatabaseConfigAdapter): Promise<string> {
    return '/storage/' + config.applicationId + '/file/' + encodeURIComponent(filename);
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

  handleFileStream(filename: any, request: any, response: any, contentType: any, thumbnail = false): any {
    return undefined;
  }

  async signedUrl(filename: string, thumbnail = false): Promise<string> {
    const bucket = thumbnail === true
      ? this.config.adapters.s3Storage.bucket + '-thumb'
      : this.config.adapters.s3Storage.bucket;
    return this.s3.presignedGetObject(bucket, filename);
  }

  async listFiles(query: { prefix: string, size: number, after: string } = {
    prefix: '',
    after: undefined,
    size: 20
  }): Promise<any> {
    const bucket = this.config.adapters.s3Storage.bucket;
    const listStream = this.s3.listObjectsV2(bucket, '', true, query.after);
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
    });
  }

  private init(config: BFastDatabaseConfigAdapter): void {
    const endPoint = config.adapters.s3Storage.endPoint;
    const accessKey = config.adapters.s3Storage.accessKey;
    const secretKey = config.adapters.s3Storage.secretKey;
    const bucket = config.adapters.s3Storage.bucket;
    // Needs the required() check for `endPoint` to have run
    const ep = new url.URL(endPoint);
    const {useSSL = ep.protocol === 'https:'} = config.adapters.s3Storage;

    // Needs `useSSL`, whether it's provided or defaulted
    const {port = ep.port ? +ep.port : (useSSL ? 443 : 80)} = config.adapters.s3Storage;
    const region = config.adapters.s3Storage.endPoint
      .replace('https://', '')
      .replace('http://', '')
      .trim().split('.')[0];
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
  //     const bucket = this.config.adapters.s3Storage.bucket + '-thumb';
  //     const thumbnailBuffer = await sharp(data)
  //         .jpeg({
  //             quality: 50,
  //         })
  //         .resize({width: 100})
  //         .toBuffer();
  //     return this.saveFile(filename, thumbnailBuffer, bucket, this.config.adapters.s3Storage.endPoint);
  // }

  private async saveFile(filename: string, data: any, bucket: string, endpoint: string): Promise<string> {
    const bucketExist = await this.s3.bucketExists(bucket);
    if (bucketExist === true) {
      await this.s3.putObject(bucket, filename, data);
      return filename;
    } else {
      const region = endpoint
        .replace('https://', '')
        .replace('http://', '')
        .trim().split('.')[0];
      await this.s3.makeBucket(bucket, region.toString().trim());
      await this.s3.putObject(bucket, filename, data);
      return filename;
    }
  }
}
