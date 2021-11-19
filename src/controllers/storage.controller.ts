import {FilesAdapter} from '../adapters/files.adapter';
import {FileModel} from '../models/file-model';
import {ContextBlock} from '../models/rules.model';
import mime from 'mime';
import {StatusCodes} from 'http-status-codes';
import {BFastOptions} from '../bfast-database.option';
import Jimp from 'jimp';
import {Buffer} from "buffer";
import {Request, Response} from 'express'
import {Storage} from "../models/storage";
import {findById} from './database.controller';

export function getSource(base64: string, type: string): any {
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

export async function saveFile(
    fileModel: FileModel, _: ContextBlock, filesAdapter: FilesAdapter, options: BFastOptions
): Promise<string> {
    const {name, base64} = fileModel;
    let {type} = fileModel;
    if (!name) {
        throw new Error('Filename required');
    }
    if (!base64) {
        throw new Error('File base64 data to save is required');
    }
    if (!type) {
        // @ts-ignore
        type = mime.getType(name);
    }
    const source = getSource(base64, type);
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
    const file: Storage = await filesAdapter.createFile(
        dataToSave.name,
        dataToSave?.data?.length,
        isBase64 === true ?
            Buffer.from(dataToSave.data, 'base64')
            : dataToSave.data,
        dataToSave?.type,
        false,
        options
    );
    return filesAdapter.getFileLocation(file.id, options);
}

export function checkStreamCapability(req: Request, filesController: FilesAdapter): boolean {
    return (
        req.get('Range')
        && typeof filesController.handleFileStream === 'function'
        && filesController.canHandleFileStream === true
    );
}

export function handleGetFileRequest(
    request: any,
    response: any,
    thumbnail: boolean,
    filesAdapter: FilesAdapter,
    options: BFastOptions
): void {
    function err(r) {
        console.log(r, 'get file request');
        response.status(StatusCodes.EXPECTATION_FAILED)
            .send({message: r && r.message ? r.message : r.toString()});
    }

    const name = request.params.filename;
    findById(
        '_Storage', {id: name, return: []}, {bypassDomainVerification: true}, options
    ).then(async (f: Storage) => {
        try {
            if (!f) {
                err({message: 'File not found'});
                return;
            }
            if (thumbnail === true && f.type?.toString()?.startsWith('image')) {
                const width = parseInt(request.query.width ? request.query.width : 100);
                const height = parseInt(request.query.height ? request.query.height : Jimp.AUTO);
                const value = await filesAdapter.getFileData(name, false, options);
                const image = await Jimp.read(value.data as any);
                const imageBuffer = await image.resize(width, height).getBufferAsync(f.type);
                response.set({
                    'Content-Disposition': `attachment; filename="${f.name}.${f.extension}"`,
                });
                response.send(imageBuffer);
            } else {
                response.set({
                    'Content-Type': f.type,
                    'Content-Length': f.size,
                    'Content-Disposition': `attachment; filename="${f.name}.${f.extension}"`,
                });
                const fstrm = await filesAdapter.getFileData(name, true, options);
                // @ts-ignore
                fstrm.data.pipe(response);
            }
        } catch (e234) {
            err(e234);
        }
    }).catch(reason => {
        err(reason);
    });
}

// export function getFileData(
//     name,
//     contentType,
//     request,
//     response,
//     filesAdapter: FilesAdapter,
//     options: BFastOptions
// ) {
//     if (checkStreamCapability(request, filesAdapter)) {
//         filesAdapter.handleFileStream(name, request, response, contentType, options).catch(_43 => {
//             response.status(StatusCodes.NOT_FOUND);
//             response.json({message: 'File not found'});
//         });
//     } else {
//         filesAdapter.getFileData(name, false, options).then(data => {
//             response.status(StatusCodes.OK);
//             response.set({
//                 'Content-Type': data.type,
//                 'Content-Length': data.size,
//                 'Content-Disposition': `attachment; filename="${data.name}.${data.extension}"`,
//             });
//             return response.send(data.data);
//         }).catch(_12 => {
//             response.status(StatusCodes.NOT_FOUND);
//             response.json({message: 'File not found'});
//         });
//     }
// }

export async function listFiles(
    data: { prefix: string, size: number, skip: number, after: string },
    filesAdapter: FilesAdapter,
    options: BFastOptions
): Promise<any[]> {
    return filesAdapter.listFiles(data, options);
}

export async function saveFromBuffer(
    fileModel: { data: Buffer; name: string; type: string, size: number },
    context: ContextBlock, filesAdapter: FilesAdapter, options: BFastOptions
): Promise<string> {
    let {type} = fileModel;
    const {name, data, size} = fileModel;
    if (!size) {
        throw new Error('File size required');
    }
    if (!name) {
        throw new Error('Filename required');
    }
    if (!data) {
        throw new Error('File base64 data to save is required');
    }
    if (!type) {
        // @ts-ignore
        type = mime.getType(name);
    }
    const pN = !!(context && context.storage && context.storage.preserveName === true);
    const file: Storage = await filesAdapter.createFile(
        name, size, data, type, pN, options
    );
    return filesAdapter.getFileLocation(file.id, options);
}

export async function deleteFile(
    data: { name: string }, _: ContextBlock, filesAdapter: FilesAdapter, options: BFastOptions
): Promise<{ id: string }> {
    const {name} = data;
    if (!name) {
        throw new Error('Filename required');
    }
    return filesAdapter.deleteFile(name, options);
}

export function isS3(filesAdapter: FilesAdapter): boolean {
    return filesAdapter.isS3;
}

export function handleGetFileBySignedUrl(
    request: any, response: any, thumbnail: boolean, filesAdapter: FilesAdapter, options: BFastOptions
): void {
    function err(r) {
        console.log(r, 'Get file by url');
        response.status(StatusCodes.EXPECTATION_FAILED)
            .send({message: r && r.message ? r.message : r.toString()});
    }

    const name = request.params.filename;
    findById(
        '_Storage', {id: name, return: []}, {bypassDomainVerification: true}, options
    ).then(async (f: Storage) => {
        try {
            if (!f) {
                err({message: 'File not found'});
                return;
            }
            const furl = await filesAdapter.signedUrl(name, options);
            if (thumbnail === true && f.type?.toString()?.startsWith('image')) {
                const width = parseInt(request.query.width ? request.query.width : 100);
                const height = parseInt(request.query.height ? request.query.height : Jimp.AUTO);
                const image = await Jimp.read(furl);
                const imageBuffer = await image.resize(width, height).getBufferAsync(f.type);
                response.set({
                    'Content-Disposition': `attachment; filename="${f.name}.${f.extension}"`,
                });
                response.send(imageBuffer);
            } else {
                response.redirect(furl);
            }
        } catch (e234) {
            err(e234);
        }
    }).catch(reason => {
        err(reason);
    });
}

export function fileInfo(
    request: Request,
    response: Response,
    filesAdapter: FilesAdapter,
    options: BFastOptions
) {
    filesAdapter.fileInfo(request?.params?.filename, options).then(info => {
        response.status(200);
        response.set('Accept-Ranges', 'bytes');
        response.set('Content-Length', info.size.toString());
        response.end();
    }).catch(_23 => {
        response.status(StatusCodes.NOT_FOUND);
        response.json({message: 'File not found'});
    });
}
