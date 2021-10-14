import {functions} from 'bfast';
import {FunctionsModel} from '../model/functions.model';
import {BFastOptions} from "../bfast-database.option";
import {FilesAdapter} from "../adapters/files.adapter";
import {GetDataFn, GetNodeFn, GetNodesFn, PurgeNodeFn, UpsertDataFn, UpsertNodeFn} from "../adapters/database.adapter";
import {
    filePolicy,
    getAllFiles,
    getFile,
    getThumbnail,
    multipartForm,
    verifyApplicationId,
    verifyRequestToken
} from "../controllers/rest.controller";

export function handleGetFile(
    filesAdapter: FilesAdapter,
    purgeNode: PurgeNodeFn,
    getNodes: GetNodesFn<any>,
    getNode,
    getDataInStore,
    options: BFastOptions
): any[] {
    return [
        (request, _, next) => {
            request.body.applicationId = request.params.appId;
            request.body.ruleId = 'files.read';
            next();
        },
        (rq, rs, n) => verifyApplicationId(rq, rs, n, options),
        (rq, rs, n) => verifyRequestToken(rq, rs, n, options),
        (rq, rs, n) => filePolicy(rq, rs, n,purgeNode, getNodes, getNode, getDataInStore, options),
        (rq, rs, n) => getFile(rq, rs, n, filesAdapter, getNode, getDataInStore, options)
    ];
}

export function handleUploadFile(
    filesAdapter: FilesAdapter,
    purgeNode: PurgeNodeFn,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getDataInStore: GetDataFn,
    upsertNode: UpsertNodeFn<any>,
    upsertDataInStore: UpsertDataFn<any>,
    options: BFastOptions
): any[] {
    return [
        (request, response, next) => {
            request.body.applicationId = request.params.appId;
            request.body.ruleId = 'files.save';
            next();
        },
        (rq, rs, n) => verifyApplicationId(rq, rs, n, options),
        (rq, rs, n) => verifyRequestToken(rq, rs, n, options),
        (rq, rs, n) => filePolicy(rq, rs, n, purgeNode, getNodes, getNode, getDataInStore, options),
        (rq, rs, n) => multipartForm(rq, rs, n, filesAdapter, upsertNode, upsertDataInStore, options)
    ];
}

export function handleGetThumbnail(
    filesAdapter: FilesAdapter,
    purgeNode: PurgeNodeFn,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getDataInStore: GetDataFn,
    options: BFastOptions
): any[] {
    return [
        (request, _, next) => {
            request.body.applicationId = request.params.appId;
            request.body.ruleId = 'files.read';
            next();
        },
        (rq, rs, n) => verifyApplicationId(rq, rs, n, options),
        (rq, rs, n) => verifyRequestToken(rq, rs, n, options),
        (rq, rs, n) => filePolicy(rq, rs, n, purgeNode, getNodes, getNode, getDataInStore, options),
        (rq, rs, n) => getThumbnail(rq, rs, n, filesAdapter, getNode, getDataInStore, options)
    ];
}

export function handleListFiles(
    filesAdapter: FilesAdapter,
    purgeNode: PurgeNodeFn,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getDataInStore: GetDataFn,
    options: BFastOptions
): any[] {
    return [
        (request, _, next) => {
            request.body.applicationId = request.params.appId;
            request.body.ruleId = 'files.list';
            next();
        },
        (rq, rs, n) => verifyApplicationId(rq, rs, n, options),
        (rq, rs, n) => verifyRequestToken(rq, rs, n, options),
        (rq, rs, n) => filePolicy(rq, rs, n, purgeNode, getNodes, getNode, getDataInStore, options),
        (rq, rs, n) => getAllFiles(rq, rs, n, filesAdapter, purgeNode, getNodes, getNode, getDataInStore, options)
    ];
}

export function getUploadFileV2(prefix = '/'): FunctionsModel {
    return functions().onGetHttpRequest(`${prefix}storage/:appId`,
        (request, response: any) => {
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
        });
}

export function getFileFromStorage(
    prefix = '/',
    filesAdapter: FilesAdapter,
    purgeNode: PurgeNodeFn,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getDataInStore: GetDataFn,
    options: BFastOptions
): FunctionsModel {
    return functions().onHttpRequest(`${prefix}storage/:appId/file/:filename`, this.handleGetFile(
        filesAdapter,
        purgeNode,
        getNodes,
        getNode,
        getDataInStore,
        options
    ));
}

export function geThumbnailFromStorage(
    prefix = '/',
    filesAdapter: FilesAdapter,
    purgeNode: PurgeNodeFn,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getDataInStore: GetDataFn,
    options: BFastOptions
): FunctionsModel {
    return functions().onGetHttpRequest(`${prefix}storage/:appId/file/:filename/thumbnail`, this.handleGetThumbnail(
        filesAdapter,
        purgeNode,
        getNodes,
        getNode,
        getDataInStore,
        options
    ));
}

export function uploadMultiPartFile(
    prefix = '/',
    filesAdapter: FilesAdapter,
    purgeNodeValue,
    getNodes,
    getNode,
    getDataInStore,
    upsertNode: UpsertNodeFn<any>,
    upsertDataInStore: UpsertDataFn<any>,
    options: BFastOptions
): FunctionsModel {
    return functions().onPostHttpRequest(`${prefix}storage/:appId`, this.handleUploadFile(
        filesAdapter,
        purgeNodeValue,
        getNodes,
        getNode,
        getDataInStore,
        upsertNode,
        upsertDataInStore,
        options
    ));
}

export function getFilesFromStorage(
    prefix = '/',
    filesAdapter: FilesAdapter,
    purgeNodeValue,
    getNodes,
    getNode,
    getDataInStore,
    options: BFastOptions
): FunctionsModel {
    return functions().onGetHttpRequest(`${prefix}storage/:appId/list`, this.handleListFiles(
        filesAdapter,
        purgeNodeValue,
        getNodes,
        getNode,
        getDataInStore,
        options
    ));
}
