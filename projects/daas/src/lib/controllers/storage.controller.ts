import {FilesAdapter} from "../adapter/FilesAdapter";
import {FileModel} from "../model/FileModel";
import {ContextBlock} from "../model/Rules";
import mime from "mime";
import {EXPECTATION_FAILED} from "http-status-codes";
import {BfastConfig} from "../bfast.config";
import {PassThrough} from "stream";

export class StorageController {
    constructor(private readonly _filesAdapter: FilesAdapter, private readonly config: BfastConfig) {
    }

    async save(fileModel: FileModel, context: ContextBlock): Promise<string> {
        let {filename, base64, type} = fileModel;
        if (!filename) {
            throw 'Filename required';
        }
        if (!base64) {
            throw 'File base64 data to save is required';
        }
        if (!type) {
            type = mime.getType(filename);
        }
        const _source = StorageController.getSource(base64, type);
        const dataToSave: {
            type?: any,
            data: any,
            filename: string,
            fileData: Object,
        } = {
            data: _source.base64,
            filename: filename,
            fileData: {
                metadata: {},
                tags: {},
            },
        }
        if (_source.type) {
            dataToSave.type = _source.type;
        }
        const isBase64 = Buffer.from(dataToSave.data, 'base64').toString('base64') === dataToSave.data;
        const file = await this._filesAdapter.createFile(
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
        return this._filesAdapter.getFileLocation(file, this.config);
    }

    isFileStreamable(req, filesController: FilesAdapter) {
        return (
            req.get('Range')
            && typeof filesController.handleFileStream === 'function'
            && filesController.canHandleFileStream === true
        );
    }

    getFileData(request, response, thumbnail = false) {
        const filename = request.params.filename;
        const contentType = mime.getType(filename);
        if (this.isFileStreamable(request, this._filesAdapter)) {
            this._filesAdapter
                .handleFileStream(filename, request, response, contentType, thumbnail)
                .catch(() => {
                    response.status(404);
                    response.set('Content-Type', 'text/plain');
                    response.end('File not found.');
                });
        } else {
            this._filesAdapter
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
        return this._filesAdapter.listFiles(data);
    }

    async saveFromBuffer(fileModel: { filename: string, data: PassThrough, type: string }, context: ContextBlock): Promise<string> {
        let {filename, data, type} = fileModel;
        if (!filename) {
            throw 'Filename required';
        }
        if (!data) {
            throw 'File base64 data to save is required';
        }
        if (!type) {
            type = mime.getType(filename);
        }
        const file = await this._filesAdapter.createFile(filename, data, type, {});
        // if (type && type.toString().startsWith('image/') === true) {
        //     try {
        //         await this._filesAdapter.createThumbnail(file, Buffer.from(data), type, {});
        //     } catch (e) {
        //         console.log(e);
        //         console.warn('Fails to save thumbnail', e);
        //     }
        // }
        return this._filesAdapter.getFileLocation(file, this.config);
    }

    async delete(data: { filename: string }, context: ContextBlock): Promise<string> {
        const {filename} = data;
        if (!filename) {
            throw 'Filename required';
        }
        await this._filesAdapter.deleteFile(filename);
        return filename;
    }

    private static getSource(base64: string, type: string) {
        let _data: string;
        let _source: {
            format: string,
            base64: string,
            type: any;
        };
        const dataUriRegexp = /^data:([a-zA-Z]+\/[-a-zA-Z0-9+.]+)(;charset=[a-zA-Z0-9\-\/]*)?;base64,/;
        const commaIndex = base64.indexOf(',');

        if (commaIndex !== -1) {
            const matches = dataUriRegexp.exec(base64.slice(0, commaIndex + 1));
            // if data URI with type and charset, there will be 4 matches.
            _data = base64.slice(commaIndex + 1);
            _source = {
                format: 'base64',
                base64: _data,
                type: matches && matches.length > 0 ? matches[1] : type
            };
        } else {
            _data = base64;
            _source = {
                format: 'base64',
                base64: _data,
                type: type
            };
        }
        return _source;
    }

    isS3(): boolean {
        return this._filesAdapter.isS3
    }

    handleGetFileBySignedUrl(request: any, response: any, thumbnail = false) {
        const filename = request.params.filename;
        this._filesAdapter.signedUrl(filename, thumbnail).then(value => {
            response.redirect(value);
        }).catch(reason => {
            response.status(EXPECTATION_FAILED).send({message: reason.toString()});
        });
    }
}
