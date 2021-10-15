import {FunctionsModel} from '../models/functions.model';
import {BFastOptions} from "../bfast-database.option";
import {FilesAdapter} from "../adapters/files.adapter";
import {
    filePolicy,
    getAllFiles,
    getFile,
    getThumbnail,
    multipartForm,
    verifyApplicationId,
    verifyRequestToken
} from "../controllers/rest.controller";

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
        (rq, rs, n) => getFile(rq, rs, n, filesAdapter, options)
    ];
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
        (rq, rs, n) => getThumbnail(rq, rs, n, filesAdapter, options)
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

export function geThumbnailFromStorage(
    prefix = '/', filesAdapter: FilesAdapter, options: BFastOptions
): FunctionsModel {
    return {
        path: `${prefix}storage/:appId/file/:filename/thumbnail`,
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
