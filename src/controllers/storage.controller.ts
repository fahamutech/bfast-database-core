import {FilesAdapter} from '../adapters/files.adapter';
import {FileModel} from '../model/file-model';
import {ContextBlock} from '../model/rules.model';
import mime from 'mime';
import {StatusCodes} from 'http-status-codes';
import {PassThrough, Stream} from 'stream';
import {BFastDatabaseOptions} from '../bfast-database.option';
import {bfast} from 'bfastnode';
import sharp from 'sharp';
import {SecurityController} from './security.controller';

export class StorageController {
    constructor(private readonly filesAdapter: FilesAdapter,
                private securityController: SecurityController,
                private config: BFastDatabaseOptions) {
    }

    private static getSource(base64: string, type: string): any {
        let data: string;
        let source: {
            format: string,
            base64: string,
            type: any;
        };
        const dataUriRegexp = /^data:([a-zA-Z]+\/[-a-zA-Z0-9+.]+)(;charset=[a-zA-Z0-9\-\/]*)?;base64,/;
        const commaIndex = base64.indexOf(',');

        if (commaIndex !== -1) {
            const matches = dataUriRegexp.exec(base64.slice(0, commaIndex + 1));
            // if data URI with type and charset, there will be 4 matches.
            data = base64.slice(commaIndex + 1);
            source = {
                format: 'base64',
                base64: data,
                type: matches && matches.length > 0 ? matches[1] : type
            };
        } else {
            data = base64;
            source = {
                format: 'base64',
                base64: data,
                type
            };
        }
        return source;
    }

    async save(fileModel: FileModel, context: ContextBlock): Promise<string> {
        const {filename, base64} = fileModel;
        let {type} = fileModel;
        if (!filename) {
            throw new Error('Filename required');
        }
        if (!base64) {
            throw new Error('File base64 data to save is required');
        }
        if (!type) {
            type = mime.getType(filename);
        }
        const source = StorageController.getSource(base64, type);
        const dataToSave: {
            type?: any,
            data: any,
            filename: string,
            fileData: any,
        } = {
            data: source.base64,
            filename,
            fileData: {
                metadata: {},
                tags: {},
            },
        };
        if (source.type) {
            dataToSave.type = source.type;
        }
        const isBase64 = Buffer.from(dataToSave.data, 'base64').toString('base64') === dataToSave.data;
        const file = await this.filesAdapter.createFile(
            dataToSave.filename,
            isBase64 === true ?
                Buffer.from(dataToSave.data, 'base64')
                : dataToSave.data,
            dataToSave?.type,
            {}
        );
        return this.filesAdapter.getFileLocation(file, this.config);
    }

    isFileStreamable(req, filesController: FilesAdapter): boolean {
        return (
            req.get('Range')
            && typeof filesController.handleFileStream === 'function'
            && filesController.canHandleFileStream === true
        );
    }

    getFileData(request, response, thumbnail = false): void {
        const filename = request.params.filename;
        const contentType = mime.getType(filename);
        if (thumbnail === true && contentType && contentType.toString().startsWith('image')) {
            this.filesAdapter.getFileData<Stream>(filename, true).then(stream => {
                const width = parseInt(request.query.width ? request.query.width : 100);
                const height = parseInt(request.query.height ? request.query.height : 0);
                stream.pipe(sharp().resize(width, height !== 0 ? height : null)).pipe(response);
            }).catch(_ => {
                this._getFileData(filename, contentType, request, response);
            });
        } else {
            this._getFileData(filename, contentType, request, response);
        }
    }

    _getFileData(filename, contentType, request, response) {
        if (this.isFileStreamable(request, this.filesAdapter)) {
            this.filesAdapter
                .handleFileStream(filename, request, response, contentType)
                .catch(() => {
                    response.status(404);
                    response.set('Content-Type', 'text/plain');
                    response.end('File not found.');
                });
        } else {
            this.filesAdapter
                .getFileData<any>(filename, false)
                .then(data => {
                    response.status(200);
                    response.set('Content-Type', contentType);
                    response.set('Content-Length', data.length);
                    response.end(data);
                })
                .catch(() => {
                    response.status(404);
                    response.set('Content-Type', 'text/plain');
                    response.end('File not found.');
                });
        }
    }

    async listFiles(data: { prefix: string, size: number, skip: number, after: string }): Promise<any[]> {
        return this.filesAdapter.listFiles(data);
    }

    async saveFromBuffer(fileModel: { filename: string, data: PassThrough, type: string }, context: ContextBlock): Promise<string> {
        let {type} = fileModel;
        const {filename, data} = fileModel;
        if (!filename) {
            throw new Error('Filename required');
        }
        if (!data) {
            throw new Error('File base64 data to save is required');
        }
        if (!type) {
            type = mime.getType(filename);
        }
        const newFilename = (context && context.storage && context.storage.preserveName === true )
            ? filename
            : this.securityController.generateUUID() + '-' + filename;
        const file = await this.filesAdapter.createFile(newFilename, data, type, {});
        return this.filesAdapter.getFileLocation(file, this.config);
    }

    async delete(data: { filename: string }, context: ContextBlock): Promise<string> {
        const {filename} = data;
        if (!filename) {
            throw new Error('Filename required');
        }
        return this.filesAdapter.deleteFile(filename);
    }

    isS3(): boolean {
        return this.filesAdapter.isS3;
    }

    handleGetFileBySignedUrl(request: any, response: any, thumbnail = false): void {
        const filename = request.params.filename;
        const contentType = mime.getType(filename);
        this.filesAdapter.signedUrl(filename).then(value => {
            if (thumbnail === true && contentType && contentType.toString().startsWith('image')) {
                // response.send('image thumbnail');
                const width = parseInt(request.query.width ? request.query.width : 100);
                const height = parseInt(request.query.height ? request.query.height : 0);
                // find a way remove this
                bfast.init({projectId: '_bfast_core_', applicationId: '_bfast_core_'},'_bfast_core_');
                bfast.functions('_bfast_core_').request(value).get<Stream>({
                    // @ts-ignore
                    responseType: 'stream'
                }).then(value1 => {
                    value1
                    .pipe(sharp().resize(width, height !== 0 ? height : null))
                    .pipe(response);
                }).catch(_ => {
                    console.log(_);
                    response.redirect(value);
                });
            } else {
                // response.send('not image thumbnail');
                response.redirect(value);
            }
        }).catch(reason => {
            response.status(StatusCodes.EXPECTATION_FAILED).send({message: reason && reason.message ? reason.message : reason.toString()});
        });
    }
}
