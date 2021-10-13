import {FilesAdapter} from '../adapters/files.adapter';
import {FileModel} from '../model/file-model';
import {ContextBlock} from '../model/rules.model';
import mime from 'mime';
import {StatusCodes} from 'http-status-codes';
import {Stream} from 'stream';
import {BFastOptions} from '../bfast-database.option';
import bfast from 'bfast';
import sharp from 'sharp';
import {Buffer} from "buffer";
import {Request, Response} from 'express'
import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn,
    PurgeNodeValueFn,
    UpsertDataFn,
    UpsertNodeFn
} from "../adapters/database.adapter";
import {generateUUID} from "./security.controller";

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
    fileModel: FileModel,
    _: ContextBlock,
    filesAdapter: FilesAdapter,
    upsertNode: UpsertNodeFn<any>,
    upsertDataInStore: UpsertDataFn<any>,
    options: BFastOptions
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
    const file = await filesAdapter.createFile(
        dataToSave.name,
        dataToSave?.data?.length,
        isBase64 === true ?
            Buffer.from(dataToSave.data, 'base64')
            : dataToSave.data,
        dataToSave?.type,
        upsertNode,
        upsertDataInStore,
        options
    );
    return filesAdapter.getFileLocation(file, options);
}

export function checkStreamCapability(req: Request, filesController: FilesAdapter): boolean {
    return (
        req.get('Range')
        && typeof filesController.handleFileStream === 'function'
        && filesController.canHandleFileStream === true
    );
}

export function handleGetFileRequest(
    request: Request,
    response: Response,
    thumbnail: boolean,
    filesAdapter: FilesAdapter,
    getNode: GetNodeFn,
    getDataInStore: GetDataFn,
    options: BFastOptions
): void {
    const name = request.params.filename;
    // @ts-ignore
    const contentType = mime.getType(name);
    if (thumbnail === true && contentType && contentType.toString().startsWith('image')) {
        filesAdapter.getFileData(
            name,
            true,
            getNode,
            getDataInStore,
            options
        ).then(value => {
            const width = parseInt(request.query.width ? request.query.width.toString() : '100');
            const height = parseInt(request.query.height ? request.query.height.toString() : '0');
            // response.set('Content-Length', data.size);
            // @ts-ignore
            value.data.pipe(sharp().resize(width, height !== 0 ? height : null)).pipe(response);
        }).catch(_ => {
            this.getFileData(name, contentType, request, response, filesAdapter, getNode, getDataInStore, options);
        });
    } else {
        this.getFileData(name, contentType, request, response, filesAdapter, getNode, getDataInStore, options);
    }
}

export function getFileData(
    name,
    contentType,
    request,
    response,
    filesAdapter: FilesAdapter,
    getNode: GetNodeFn,
    getDataInStore: GetDataFn,
    options: BFastOptions
) {
    if (this.checkStreamCapability(request, filesAdapter)) {
        filesAdapter
            .handleFileStream(
                name,
                request,
                response,
                getNode,
                getDataInStore,
                contentType,
                options
            ).catch(_43 => {
            response.status(StatusCodes.NOT_FOUND);
            // response.set('Content-Type', 'text/plain');
            response.json({message: 'File not found'});
        });
    } else {
        filesAdapter
            .getFileData(
                name,
                false,
                getNode,
                getDataInStore,
                options
            ).then(data => {
            response.status(StatusCodes.OK);
            response.set({
                'Content-Type': data.type,
                'Content-Length': data.size
            });
            return response.send(data.data);
        }).catch(_12 => {
            response.status(StatusCodes.NOT_FOUND);
            response.json({message: 'File not found'});
        });
    }
}

export async function listFiles(
    data: { prefix: string, size: number, skip: number, after: string },
    filesAdapter: FilesAdapter,
    purgeNodeValue: PurgeNodeValueFn,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getDataInStore: GetDataFn,
    options: BFastOptions
): Promise<any[]> {
    return filesAdapter.listFiles(
        data,
        purgeNodeValue,
        getNodes,
        getNode,
        getDataInStore,
        options
    );
}

export async function saveFromBuffer(
    fileModel: { data: Buffer; name: string; type: string, size: number },
    context: ContextBlock,
    filesAdapter: FilesAdapter,
    upsertNode: UpsertNodeFn<any>,
    upsertDataInStore: UpsertDataFn<any>,
    options: BFastOptions
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
    const newFilename = (context && context.storage && context.storage.preserveName === true)
        ? name
        : generateUUID() + '-' + name;
    const file = await filesAdapter.createFile(
        newFilename,
        size,
        data,
        type,
        upsertNode,
        upsertDataInStore,
        options
    );
    return filesAdapter.getFileLocation(file, options);
}

export async function deleteFile(
    data: { name: string },
    _: ContextBlock,
    purgeNodeValue: PurgeNodeValueFn,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getDataInStore: GetDataFn,
    filesAdapter: FilesAdapter,
    options: BFastOptions
): Promise<string> {
    const {name} = data;
    if (!name) {
        throw new Error('Filename required');
    }
    return filesAdapter.deleteFile(
        name,
        purgeNodeValue,
        getNodes,
        getNode,
        getDataInStore,
        options
    );
}

export function isS3(filesAdapter: FilesAdapter): boolean {
    return filesAdapter.isS3;
}

export function handleGetFileBySignedUrl(
    request: any,
    response: any,
    thumbnail,
    filesAdapter: FilesAdapter,
    options: BFastOptions
): void {
    const name = request.params.filename;
    // @ts-ignore
    const contentType = mime.getType(name);
    filesAdapter.signedUrl(name, options).then(value => {
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

export function fileInfo(
    request: Request,
    response: Response,
    getNode: GetNodeFn,
    getDataInStore: GetDataFn,
    filesAdapter: FilesAdapter,
    options: BFastOptions
) {
    filesAdapter
        .fileInfo(
            request?.params?.filename,
            getNode,
            getDataInStore,
            options
        ).then(info => {
        response.status(200);
        response.set('Accept-Ranges', 'bytes');
        response.set('Content-Length', info.size.toString());
        response.end();
    })
        .catch(_23 => {
            response.status(StatusCodes.NOT_FOUND);
            response.json({message: 'File not found'});
        });
}
