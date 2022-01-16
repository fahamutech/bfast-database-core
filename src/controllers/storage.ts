import {FilesAdapter} from '../adapters/files.adapter';
import {FileModel} from '../models/file-model';
import mime from 'mime';
import {StatusCodes} from 'http-status-codes';
import {BFastOptions} from '../bfast-option';
import {Buffer} from "buffer";
import {Request, Response} from 'express'
import {ListFileQuery, Storage} from "../models/storage";
import {ReadableStream} from "stream/web";
import sharp from 'sharp'
import {RuleContext} from "../models/rule-context";
import {validateInput} from "../utils";

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

export async function saveFileInStore(
    fileModel: FileModel, _: RuleContext, filesAdapter: FilesAdapter, options: BFastOptions
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
    const file: Storage<any> = await filesAdapter.createFile(
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

async function compressImage(
    file: Storage<any>, width: number, height: number, filesAdapter: FilesAdapter, options
): Promise<Buffer> {
    // const width = parseInt(request.query.width ? request.query.width : 100);
    // const height = parseInt(request.query.height ? request.query.height : Jimp.AUTO);
    const f: Buffer = await filesAdapter.getFileBuffer(file, options);
    const image = await sharp(f);
    console.log(width,height,'THUMB');
    // response.set({
    //     'Content-Disposition': `attachment; filename="${f.name}.${f.extension}"`,
    // });
    // header: {
    //     'Content-Disposition': `attachment; filename="${file.name}.${file.extension}"`,
    // },
    // return {
    return await image.resize(width, height).toBuffer()
    // }
}

async function compressImageByUrl(
    file: string, width: number, height: number, filesAdapter: FilesAdapter, options
): Promise<Buffer> {
    // const width = parseInt(request.query.width ? request.query.width : 100);
    // const height = parseInt(request.query.height ? request.query.height : Jimp.AUTO);
    // const f: Buffer = await filesAdapter.getFileBuffer(file, options);
    const image = await sharp(file);
    // response.set({
    //     'Content-Disposition': `attachment; filename="${f.name}.${f.extension}"`,
    // });
    // header: {
    //     'Content-Disposition': `attachment; filename="${file.name}.${file.extension}"`,
    // },
    // return {
    return await image.resize(width, height).toBuffer()
    // }
}

export async function handleGetFileRequest(
    f: Storage<any>,
    width: number, height: number,
    thumbnail: boolean,
    filesAdapter: FilesAdapter,
    options: BFastOptions
): Promise<Buffer | ReadableStream> {
    if (!f) {
        throw {message: 'File not found'};
    }
    if (thumbnail === true && f.type?.toString()?.startsWith('image')) {
        return compressImage(f, width, height, filesAdapter, options);
    } else {
        return await filesAdapter.getFileStream(f, options);
    }
}

export async function listFilesFromStore(
    data: ListFileQuery, filesAdapter: FilesAdapter, options: BFastOptions
): Promise<any[]> {
    await validateInput(data,{type: 'object'},'invalid file query data')
    return filesAdapter.listFiles(data, options);
}

export async function saveFromBuffer(
    fileModel: { data: Buffer; name: string; type: string, size: number },
    context: RuleContext, filesAdapter: FilesAdapter, options: BFastOptions
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
    const file: Storage<any> = await filesAdapter.createFile(
        name, size, data, type, pN, options
    );
    return filesAdapter.getFileLocation(file.id, options);
}

export async function deleteFileInStore(
    data: { name: string }, _: RuleContext, filesAdapter: FilesAdapter, options: BFastOptions
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

export function getTypeFromUrl(furl: string) {
    return mime.getType(furl)
}

export async function handleGetFileBySignedUrl<T>(
    name: string,
    width: number,
    height: number,
    thumbnail: boolean,
    filesAdapter: FilesAdapter,
    options: BFastOptions
): Promise<Buffer | string> {
    // const f: Storage<any> = await findDataByIdInStore(
    //     '_Storage', {id: name, return: []}, {bypassDomainVerification: true}, options
    // );
    // if (!f) {
    //     throw {message: 'File not found'};
    // }
    const furl = await filesAdapter.signedUrl(name, options);
    const type = await getTypeFromUrl(furl)
    if (thumbnail === true && type?.toString()?.startsWith('image')) {
        return compressImageByUrl(furl, width, height, filesAdapter, options);
    } else {
        return furl;
    }
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
