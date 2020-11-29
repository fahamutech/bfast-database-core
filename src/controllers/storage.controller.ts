import {FilesAdapter} from '../adapters/files.adapter';
import {FileModel} from '../model/file-model';
import {ContextBlock} from '../model/rules.model';
import mime from 'mime';
import {StatusCodes} from 'http-status-codes';
import {PassThrough} from 'stream';
import {BFastDatabaseConfigAdapter} from '../bfast.config';


let filesAdapter: FilesAdapter;
let config: BFastDatabaseConfigAdapter;

export class StorageController {
    constructor(files: FilesAdapter,
                configAdapter: BFastDatabaseConfigAdapter) {
        filesAdapter = files;
        config = configAdapter;
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
        const file = await filesAdapter.createFile(
            dataToSave.filename,
            isBase64 === true ?
                Buffer.from(dataToSave.data, 'base64')
                : dataToSave.data,
            dataToSave?.type,
            {}
        );
        // if (type && type.toString().startsWith('image/') === true) {
        //     try {
        //         await this._filesAdapter.createThumbnail(
        //             file,
        //             isBase64 === true ?
        //                 Buffer.from(dataToSave.data, 'base64')
        //                 : dataToSave.data, type,
        //             {}
        //         );
        //     } catch (e) {
        //         console.warn('Fails to save thumbnail', e);
        //     }
        // }
        return filesAdapter.getFileLocation(file, config);
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
        if (this.isFileStreamable(request, filesAdapter)) {
            filesAdapter
                .handleFileStream(filename, request, response, contentType, thumbnail)
                .catch(() => {
                    response.status(404);
                    response.set('Content-Type', 'text/plain');
                    response.end('File not found.');
                });
        } else {
            filesAdapter
                .getFileData(filename, thumbnail)
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
        return filesAdapter.listFiles(data);
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
        const file = await filesAdapter.createFile(filename, data, type, {});
        // if (type && type.toString().startsWith('image/') === true) {
        //     try {
        //         await this._filesAdapter.createThumbnail(file, Buffer.from(data), type, {});
        //     } catch (e) {
        //         console.log(e);
        //         console.warn('Fails to save thumbnail', e);
        //     }
        // }
        return filesAdapter.getFileLocation(file, config);
    }

    async delete(data: { filename: string }, context: ContextBlock): Promise<string> {
        const {filename} = data;
        if (!filename) {
            throw new Error('Filename required');
        }
        await filesAdapter.deleteFile(filename);
        return filename;
    }

    isS3(): boolean {
        return filesAdapter.isS3;
    }

    handleGetFileBySignedUrl(request: any, response: any, thumbnail = false): void {
        const filename = request.params.filename;
        filesAdapter.signedUrl(filename, thumbnail).then(value => {
            response.redirect(value);
        }).catch(reason => {
            response.status(StatusCodes.EXPECTATION_FAILED).send({message: reason.toString()});
        });
    }
}
