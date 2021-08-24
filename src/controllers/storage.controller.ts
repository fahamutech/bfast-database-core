import {FilesAdapter} from '../adapters/files.adapter';
import {FileModel} from '../model/file-model';
import {ContextBlock} from '../model/rules.model';
import mime from 'mime';
import {StatusCodes} from 'http-status-codes';
import {PassThrough, pipeline, Stream} from 'stream';
import {BFastDatabaseOptions} from '../bfast-database.option';
import bfast from 'bfast';
import sharp from 'sharp';
import {SecurityController} from './security.controller';
import {ReadStream} from "fs";
import {Buffer} from "buffer";

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

    async save(fileModel: FileModel, _: ContextBlock): Promise<string> {
        const {name, base64} = fileModel;
        let {type} = fileModel;
        if (!name) {
            throw new Error('Filename required');
        }
        if (!base64) {
            throw new Error('File base64 data to save is required');
        }
        if (!type) {
            type = mime.getType(name);
        }
        const source = StorageController.getSource(base64, type);
        const dataToSave: {
            type?: any,
            data: any,
            name: string,
            fileData: any,
        } = {
            data: source.base64,
            name,
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
            dataToSave.name,
            dataToSave?.data?.length,
            isBase64 === true ?
                Buffer.from(dataToSave.data, 'base64')
                : dataToSave.data,
            dataToSave?.type,
            {}
        );
        return this.filesAdapter.getFileLocation(file, this.config);
    }

    checkStreamCapability(req, filesController: FilesAdapter): boolean {
        return (
            req.get('Range')
            && typeof filesController.handleFileStream === 'function'
            && filesController.canHandleFileStream === true
        );
    }

    handleGetFileRequest(request, response, thumbnail = false): void {
        const name = request.params.filename;
        const contentType = mime.getType(name);
        if (thumbnail === true && contentType && contentType.toString().startsWith('image')) {
            this.filesAdapter.getFileData(name, true).then(value => {
                const width = parseInt(request.query.width ? request.query.width : 100);
                const height = parseInt(request.query.height ? request.query.height : 0);
                // response.set('Content-Length', data.size);
                // @ts-ignore
                value.data.pipe(sharp().resize(width, height !== 0 ? height : null)).pipe(response);
            }).catch(_ => {
                this.getFileData(name, contentType, request, response);
            });
        } else {
            this.getFileData(name, contentType, request, response);
        }
    }

    getFileData(name, contentType, request, response) {
        if (this.checkStreamCapability(request, this.filesAdapter)) {
            this.filesAdapter
                .handleFileStream(name, request, response, contentType)
                .catch(_43 => {
                    response.status(StatusCodes.NOT_FOUND);
                    // response.set('Content-Type', 'text/plain');
                    response.json({message: 'File not found'});
                });
        } else {
            this.filesAdapter
                .getFileData(name, false)
                .then(data => {
                    response.status(StatusCodes.OK);
                    response.set({
                        'Content-Type': data.type,
                        'Content-Length': data.size
                    });
                    return response.send(data.data);
                })
                .catch(_12 => {
                    response.status(StatusCodes.NOT_FOUND);
                    response.json({message: 'File not found'});
                });
        }
    }

    async listFiles(data: { prefix: string, size: number, skip: number, after: string }): Promise<any[]> {
        return this.filesAdapter.listFiles(data);
    }

    async saveFromBuffer(
        fileModel: { data: Buffer; name: string; type: string, size: number },
        context: ContextBlock
    ): Promise<string> {
        let {type} = fileModel;
        const {name, data, size} = fileModel;
        if (!size){
            throw new Error('File size required');
        }
        if (!name) {
            throw new Error('Filename required');
        }
        if (!data) {
            throw new Error('File base64 data to save is required');
        }
        if (!type) {
            type = mime.getType(name);
        }
        const newFilename = (context && context.storage && context.storage.preserveName === true)
            ? name
            : this.securityController.generateUUID() + '-' + name;
        const file = await this.filesAdapter.createFile(newFilename, size, data, type, {});
        return this.filesAdapter.getFileLocation(file, this.config);
    }

    async delete(data: { name: string }, _: ContextBlock): Promise<string> {
        const {name} = data;
        if (!name) {
            throw new Error('Filename required');
        }
        return this.filesAdapter.deleteFile(name);
    }

    isS3(): boolean {
        return this.filesAdapter.isS3;
    }

    handleGetFileBySignedUrl(request: any, response: any, thumbnail = false): void {
        const name = request.params.filename;
        const contentType = mime.getType(name);
        this.filesAdapter.signedUrl(name).then(value => {
            if (thumbnail === true && contentType && contentType.toString().startsWith('image')) {
                // response.send('image thumbnail');
                const width = parseInt(request.query.width ? request.query.width : 100);
                const height = parseInt(request.query.height ? request.query.height : 0);
                // find a way remove this
                bfast.init({projectId: '_bfast_core_', applicationId: '_bfast_core_'}, '_bfast_core_');
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

    fileInfo(request: any, response: any) {
        this.filesAdapter.fileInfo(request?.params?.filename)
            .then(info => {
                response.status(200);
                response.set('Accept-Ranges', 'bytes');
                response.set('Content-Length', info.size);
                response.end();
            })
            .catch(_23 => {
                response.status(StatusCodes.NOT_FOUND);
                response.json({message: 'File not found'});
            });
    }
}
