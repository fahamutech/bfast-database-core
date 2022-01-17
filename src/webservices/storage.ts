import {FunctionsModel} from '../models/functions.model';
import {BFastOptions} from "../bfast-option";
import {FilesAdapter} from "../adapters/files";
import {verifyApplicationId, verifyRequestToken} from "../controllers/rest";
import {
    fileInfo,
    handleGetFileBySignedUrl,
    handleGetFileRequest,
    isS3,
    listFilesFromStore,
    saveFromBuffer
} from "../controllers/storage";
import httpStatus, {StatusCodes} from "http-status-codes";
import {ReadableStream} from "stream/web";
import {Readable} from "stream";
import {Buffer} from "buffer";
import {ListFileQuery, Storage} from "../models/storage";
import {findDataByIdInStore} from "../controllers/database";
import {ruleHasPermission} from "../controllers/policy";
import {promisify} from "util";
import {readFile} from "fs";
import formidable from 'formidable';
import {DatabaseAdapter} from "../adapters/database";

function filePolicy(
    request: any, response: any, next: any, databaseAdapter: DatabaseAdapter, options: BFastOptions
): void {
    ruleHasPermission(request.body.ruleId, request.body.context, databaseAdapter, options).then(value => {
        if (value === true) {
            next();
        } else {
            throw {message: 'You can\'t access this file'};
        }
    }).catch(reason => {
        response.status(StatusCodes.UNAUTHORIZED).send(reason);
    });
}

function multipartForm(
    request: any, response: any, _: any, filesAdapter: FilesAdapter, options: BFastOptions
): void {
    const contentType = request.get('content-type').split(';')[0].toString().trim();
    if (contentType !== 'multipart/form-data'.trim()) {
        response.status(StatusCodes.BAD_REQUEST).json({message: 'Accept only multipart request'});
        return;
    }
    const form = formidable({
        multiples: true,
        maxFileSize: 10 * 1024 * 1024 * 1024,
        keepExtensions: true
    });
    form.parse(request, async (err, fields, files) => {
        try {
            if (err) {
                response.status(StatusCodes.BAD_REQUEST).send(err.toString());
                return;
            }
            const urls = [];
            if (
                request && request.query && request.query.pn && request.query.pn.toString().trim().toLowerCase() === 'true'
            ) {
                request.body.context.storage = {preserveName: true};
            } else {
                request.body.context.storage = {preserveName: false};
            }
            for (const file of Object.values<any>(files)) {
                // console.log(JSON.stringify(file, null, 4),'FILE')
                const fileMeta: { name: string, type: string } = {name: undefined, type: undefined};
                const regx = /[^0-9a-z.]/gi;
                fileMeta.name = file.originalFilename ? file.originalFilename : file.newFilename.toString().replace(regx, '');
                fileMeta.type = file.type;
                const result = await saveFromBuffer({
                        data: await promisify(readFile)(file.filepath),
                        type: fileMeta.type,
                        size: file.size,
                        name: fileMeta.name
                    },
                    request.body.context,
                    filesAdapter,
                    options);
                urls.push(result);
            }
            for (const f_key of Object.keys(fields)) {
                // console.log(JSON.stringify(f_key, null, 4),'FKEY')
                const fileMeta: { name: string, type: string } = {name: undefined, type: undefined};
                const regx = /[^0-9a-z.]/gi;
                fileMeta.name = f_key
                    .toString()
                    .replace(regx, '');
                // @ts-ignore
                fileMeta.type = mime.getType(f_key);
                const result = await saveFromBuffer({
                        data: Buffer.from(fields[f_key]),
                        type: fileMeta.type,
                        size: fields[f_key]?.length,
                        name: fileMeta.name
                    },
                    request.body.context,
                    filesAdapter,
                    options
                );
                urls.push(result);
            }
            response.status(StatusCodes.OK).json({urls});
        } catch (e) {
            console.log(e);
            response.status(StatusCodes.BAD_REQUEST).end(e.toString());
        }
    });
}

async function getStorage(id: string, databaseAdapter: DatabaseAdapter, options: BFastOptions) {
    const wOptions = {bypassDomainVerification: true}
    const rule = {id: id, return: []}
    const f: Storage<any> = await findDataByIdInStore('_Storage', rule, databaseAdapter, wOptions, options);
    if (!f) throw {message: "File not found"};
    return f;
}

export function handleGetFile(
    filesAdapter: FilesAdapter, databaseAdapter: DatabaseAdapter, options: BFastOptions
): any[] {
    return [
        (request, _, next) => {
            request.body.applicationId = request.params.appId;
            request.body.ruleId = 'files.read';
            next();
        },
        (rq, rs, n) => verifyApplicationId(rq, rs, n, options),
        (rq, rs, n) => verifyRequestToken(rq, rs, n, options),
        (rq, rs, n) => filePolicy(rq, rs, n, databaseAdapter, options),
        (request, response) => {
            if (request.method.toLowerCase() === 'head') {
                fileInfo(request, response, filesAdapter, options);
            } else {
                const filename = request.params.filename;
                if (isS3(filesAdapter) === true) {
                    return handleGetFileBySignedUrl(
                        filename, null, null, false, filesAdapter, options
                    );
                } else {
                    getStorage(filename, databaseAdapter, options).then(f => {
                        response.set({
                            'Content-Type': f.type,
                            'Content-Length': f.size,
                            'Content-Disposition': `attachment; filename="${f.name}.${f.extension}"`,
                        });
                        return handleGetFileRequest(f, null, null, false, filesAdapter, options);
                    }).then(value => {
                        returnFile(value, response);
                    }).catch(reason => {
                        // console.log(reason);
                        response.status(httpStatus.BAD_REQUEST).send(reason);
                    });
                }
            }
        }
    ];
}

function returnFile(value: Buffer | ReadableStream | string, response) {
    if (typeof value === "string") {
        response.redirect(value);
    } else {
        if (value instanceof Buffer) {
            response.status(httpStatus.OK).send(value);
        } else if (value instanceof Readable) {
            value.pipe(response)
            // pipeline(value, response, err => {
            //     if (err) {
            //         console.log(err);
            //         try {
            //             response.end()
            //         } catch (_) {
            //         }
            //     }
            // });
        } else {
            throw {message: 'file data can not be determined'}
        }
    }
}

export function handleUploadFile(
    filesAdapter: FilesAdapter, databaseAdapter: DatabaseAdapter, options: BFastOptions
): any[] {
    return [
        (request, response, next) => {
            request.body.applicationId = request.params.appId;
            request.body.ruleId = 'files.save';
            next();
        },
        (rq, rs, n) => verifyApplicationId(rq, rs, n, options),
        (rq, rs, n) => verifyRequestToken(rq, rs, n, options),
        (rq, rs, n) => filePolicy(rq, rs, n, databaseAdapter, options),
        (rq, rs, n) => multipartForm(rq, rs, n, filesAdapter, options)
    ];
}

export function handleGetThumbnail(
    filesAdapter: FilesAdapter, databaseAdapter: DatabaseAdapter, options: BFastOptions
): any[] {
    return [
        (request, _, next) => {
            request.body.applicationId = request.params.appId;
            request.body.ruleId = 'files.read';
            next();
        },
        (rq, rs, n) => verifyApplicationId(rq, rs, n, options),
        (rq, rs, n) => verifyRequestToken(rq, rs, n, options),
        (rq, rs, n) => filePolicy(rq, rs, n, databaseAdapter, options),
        (request, response) => {
            if (request.method.toLowerCase() === 'head') {
                fileInfo(request, response, filesAdapter, options);
            } else {
                const width = parseInt(request.query.width ? request.query.width : 100);
                let height = parseInt(request.query.height ? request.query.height : -1);
                if (height === -1) {
                    height = undefined
                }
                const filename = request.params.filename;
                if (isS3(filesAdapter) === true) {
                    return handleGetFileBySignedUrl(
                        filename, null, null, true, filesAdapter, options
                    );
                } else {
                    getStorage(filename, databaseAdapter, options).then(f => {
                        response.set({
                            'Content-Disposition': `attachment; filename="${f.name}.${f.extension}"`,
                        });
                        return handleGetFileRequest(f, width, height, true, filesAdapter, options);
                    }).then(value => {
                        returnFile(value, response);
                    }).catch(reason => {
                        response.status(httpStatus.BAD_REQUEST).send(reason);
                    });
                }
            }
        }
    ];
}

export function handleListFilesREST(
    filesAdapter: FilesAdapter, databaseAdapter: DatabaseAdapter, options: BFastOptions
): any[] {
    return [
        (request, _, next) => {
            request.body.applicationId = request.params.appId;
            request.body.ruleId = 'files.list';
            next();
        },
        (rq, rs, n) => verifyApplicationId(rq, rs, n, options),
        (rq, rs, n) => verifyRequestToken(rq, rs, n, options),
        (rq, rs, n) => filePolicy(rq, rs, n, databaseAdapter, options),
        (request, response) => {
            const query: ListFileQuery = {
                skip: isNaN(Number(request.query.skip)) ? 0 : parseInt(request.query.skip),
                after: request.query.after ? request.query.after.toString() : '',
                size: isNaN(Number(request.query.size)) ? 20 : parseInt(request.query.size),
                prefix: request.query.prefix ? request.query.prefix.toString() : '',
            }
            listFilesFromStore(query, filesAdapter, options).then(value => {
                response.json(value);
            }).catch(reason => {
                response.status(StatusCodes.EXPECTATION_FAILED).send({message: reason.toString()});
            });
        }
    ];
}

export function getUploadFileV2(prefix = '/'): FunctionsModel {
    return {
        path: `${prefix}storage/:appId`,
        method: 'GET',
        onRequest: (request, response: any) => {
            // show a file upload form
            response.writeHead(200, {'content-type': 'text/html'});
            response.end(`
                    <h2>With Node.js <code>"http"</code> module</h2>
                    <form action="${prefix}storage/${request.params.appId}" enctype="multipart/form-data" method="post">
<!--                      <div>Text field title: <input type="text" name="file" /></div>-->
                      <div>File: <input type="file" name="multipleFiles" multiple="multiple" /></div>
                      <input type="submit" value="Upload" />
                    </form>
                 `);
        }
    }
}

export function getFileFromStorage(
    prefix = '/', filesAdapter: FilesAdapter, databaseAdapter: DatabaseAdapter, options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}storage/:appId/file/:filename`,
        method: 'GET',
        onRequest: handleGetFile(filesAdapter, databaseAdapter, options)
    }
}

export function getFileV2FromStorage(
    prefix = '/', filesAdapter: FilesAdapter, databaseAdapter: DatabaseAdapter, options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}v2/storage/:appId/file/:filename`,
        method: 'GET',
        onRequest: handleGetFile(filesAdapter, databaseAdapter, options)
    }
}

export function geThumbnailFromStorage(
    prefix = '/', filesAdapter: FilesAdapter, databaseAdapter: DatabaseAdapter, options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}storage/:appId/file/:filename/thumbnail`,
        method: 'GET',
        onRequest: handleGetThumbnail(filesAdapter, databaseAdapter, options)
    }
}

export function geThumbnailV2FromStorage(
    prefix = '/', filesAdapter: FilesAdapter, databaseAdapter: DatabaseAdapter, options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}v2/storage/:appId/file/:filename/thumbnail`,
        method: 'GET',
        onRequest: handleGetThumbnail(filesAdapter, databaseAdapter, options)
    }
}

export function uploadMultiPartFile(
    prefix = '/', filesAdapter: FilesAdapter, databaseAdapter: DatabaseAdapter, options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}storage/:appId`,
        method: 'POST',
        onRequest: handleUploadFile(filesAdapter, databaseAdapter, options)
    };
}

export function getFilesFromStorage(
    prefix = '/', filesAdapter: FilesAdapter, databaseAdapter: DatabaseAdapter, options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}storage/:appId/list`,
        method: 'GET',
        onRequest: handleListFilesREST(filesAdapter, databaseAdapter, options)
    };
}
