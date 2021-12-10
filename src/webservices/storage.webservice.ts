import {FunctionsModel} from '../models/functions.model';
import {BFastOptions} from "../bfast-database.option";
import {FilesAdapter} from "../adapters/files.adapter";
import {
    filePolicy,
    getAllFiles,
    multipartForm,
    verifyApplicationId,
    verifyRequestToken
} from "../controllers/rest.controller";
import {fileInfo, handleGetFileBySignedUrl, handleGetFileRequest, isS3} from "../controllers/storage";
import httpStatus from "http-status-codes";
import {ReadableStream} from "stream/web";
import {pipeline, Readable} from "stream";
import {Buffer} from "buffer";
import {Storage} from "../models/storage";
import {findById} from "../controllers/database.controller";

async function getStorage(id: string, options: BFastOptions) {
    const f: Storage<any> = await findById(
        '_Storage', {id: id, return: []}, {bypassDomainVerification: true},
        options
    );
    if (!f) {
        throw {message: "File not found"};
    }
    return f;
}

export function handleGetFile(filesAdapter: FilesAdapter, options: BFastOptions): any[] {
    return [
        (request, _, next) => {
            request.body.applicationId = request.params.appId;
            request.body.ruleId = 'files.read';
            next();
        },
        (rq, rs, n) => verifyApplicationId(rq, rs, n, options),
        (rq, rs, n) => verifyRequestToken(rq, rs, n, options),
        (rq, rs, n) => filePolicy(rq, rs, n, options),
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
                    getStorage(filename, options).then(f => {
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

export function handleUploadFile(filesAdapter: FilesAdapter, options: BFastOptions): any[] {
    return [
        (request, response, next) => {
            request.body.applicationId = request.params.appId;
            request.body.ruleId = 'files.save';
            next();
        },
        (rq, rs, n) => verifyApplicationId(rq, rs, n, options),
        (rq, rs, n) => verifyRequestToken(rq, rs, n, options),
        (rq, rs, n) => filePolicy(rq, rs, n, options),
        (rq, rs, n) => multipartForm(rq, rs, n, filesAdapter, options)
    ];
}

export function handleGetThumbnail(filesAdapter: FilesAdapter, options: BFastOptions): any[] {
    return [
        (request, _, next) => {
            request.body.applicationId = request.params.appId;
            request.body.ruleId = 'files.read';
            next();
        },
        (rq, rs, n) => verifyApplicationId(rq, rs, n, options),
        (rq, rs, n) => verifyRequestToken(rq, rs, n, options),
        (rq, rs, n) => filePolicy(rq, rs, n, options),
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
                    getStorage(filename, options).then(f => {
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

export function handleListFiles(filesAdapter: FilesAdapter, options: BFastOptions): any[] {
    return [
        (request, _, next) => {
            request.body.applicationId = request.params.appId;
            request.body.ruleId = 'files.list';
            next();
        },
        (rq, rs, n) => verifyApplicationId(rq, rs, n, options),
        (rq, rs, n) => verifyRequestToken(rq, rs, n, options),
        (rq, rs, n) => filePolicy(rq, rs, n, options),
        (rq, rs, n) => getAllFiles(rq, rs, n, filesAdapter, options)
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
    prefix = '/', filesAdapter: FilesAdapter, options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}storage/:appId/file/:filename`,
        method: 'GET',
        onRequest: handleGetFile(filesAdapter, options)
    }
}

export function getFileV2FromStorage(
    prefix = '/', filesAdapter: FilesAdapter, options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}v2/storage/:appId/file/:filename`,
        method: 'GET',
        onRequest: handleGetFile(filesAdapter, options)
    }
}

export function geThumbnailFromStorage(
    prefix = '/', filesAdapter: FilesAdapter, options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}storage/:appId/file/:filename/thumbnail`,
        method: 'GET',
        onRequest: handleGetThumbnail(filesAdapter, options)
    }
}

export function geThumbnailV2FromStorage(
    prefix = '/', filesAdapter: FilesAdapter, options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}v2/storage/:appId/file/:filename/thumbnail`,
        method: 'GET',
        onRequest: handleGetThumbnail(filesAdapter, options)
    }
}

export function uploadMultiPartFile(
    prefix = '/', filesAdapter: FilesAdapter, options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}storage/:appId`,
        method: 'POST',
        onRequest: handleUploadFile(filesAdapter, options)
    };
}

export function getFilesFromStorage(
    prefix = '/', filesAdapter: FilesAdapter, options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}storage/:appId/list`,
        method: 'GET',
        onRequest: handleListFiles(filesAdapter, options)
    };
}
