import {functions} from 'bfast';
import {FunctionsModel} from '../model/functions.model';
import {RestController} from "../controllers/rest.controller";
import {BFastOptions} from "../bfast-database.option";
import {SecurityController} from "../controllers/security.controller";
import {AuthController} from "../controllers/auth.controller";
import {StorageController} from "../controllers/storage.controller";
import {FilesAdapter} from "../adapters/files.adapter";
import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn,
    PurgeDataFn,
    PurgeNodeValueFn,
    UpsertDataFn,
    UpsertNodeFn
} from "../adapters/database.adapter";


export class StorageWebservice {
    constructor() {
    }

    handleGetFile(
        securityController: SecurityController,
        restController: RestController,
        storageController: StorageController,
        authController: AuthController,
        filesAdapter: FilesAdapter,
        purgeDataInStore: PurgeDataFn,
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
            (rq, rs, n) => restController
                .verifyApplicationId(
                    rq,
                    rs,
                    n,
                    options
                ),
            (rq, rs, n) => restController
                .verifyToken(
                    rq,
                    rs,
                    n,
                    securityController,
                    options
                ),
            (rq, rs, n) => restController
                .filePolicy(
                    rq,
                    rs,
                    n,
                    securityController,
                    authController,
                    purgeDataInStore,
                    getNodes,
                    getNode,
                    getDataInStore,
                    options
                ),
            (rq, rs, n) => restController
                .getFile(
                    rq,
                    rs,
                    n,
                    storageController,
                    filesAdapter,
                    getNode,
                    getDataInStore,
                    options
                )
        ];
    }

    handleUploadFile(
        restController: RestController,
        securityController: SecurityController,
        authController: AuthController,
        storageController: StorageController,
        filesAdapter: FilesAdapter,
        purgeNodeValue: PurgeNodeValueFn,
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
            (rq, rs, n) => restController
                .verifyApplicationId(
                    rq,
                    rs,
                    n,
                    options
                ),
            (rq, rs, n) => restController
                .verifyToken(
                    rq,
                    rs,
                    n,
                    securityController,
                    options
                ),
            (rq, rs, n) => restController
                .filePolicy(
                    rq,
                    rs,
                    n,
                    securityController,
                    authController,
                    purgeNodeValue,
                    getNodes,
                    getNode,
                    getDataInStore,
                    options
                ),
            (rq, rs, n) => restController
                .multipartForm(
                    rq,
                    rs,
                    n,
                    storageController,
                    securityController,
                    filesAdapter,
                    upsertNode,
                    upsertDataInStore,
                    options
                )
        ];
    }

    handleGetThumbnail(
        restController: RestController,
        securityController: SecurityController,
        authController: AuthController,
        storageController: StorageController,
        filesAdapter: FilesAdapter,
        purgeNodeValue: PurgeNodeValueFn,
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
            (rq, rs, n) => restController.verifyApplicationId(rq, rs, n, options),
            (rq, rs, n) => restController.verifyToken(rq, rs, n,securityController,options),
            (rq, rs, n) => restController
                .filePolicy(
                    rq,
                    rs,
                    n,
                    securityController,
                    authController,
                    purgeNodeValue,
                    getNodes,
                    getNode,
                    getDataInStore,
                    options
                ),
            (rq, rs, n) => restController.getThumbnail(
                rq,
                rs,
                n,
                storageController,
                filesAdapter,
                getNode,
                getDataInStore,
                options
            )
        ];
    }

    handleListFiles(
        restController: RestController,
        securityController: SecurityController,
        authController: AuthController,
        storageController: StorageController,
        filesAdapter: FilesAdapter,
        purgeNodeValue: PurgeNodeValueFn,
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
            (rq, rs, n) => restController.verifyApplicationId(
                rq,
                rs,
                n,
                options
            ),
            (rq, rs, n) => restController.verifyToken(rq, rs, n, securityController, options),
            (rq, rs, n) => restController
                .filePolicy(
                    rq,
                    rs,
                    n,
                    securityController,
                    authController,
                    purgeNodeValue,
                    getNodes,
                    getNode,
                    getDataInStore,
                    options
                ),
            (rq, rs, n) => restController.getAllFiles(
                rq,
                rs,
                n,
                storageController,
                filesAdapter,
                purgeNodeValue,
                getNodes,
                getNode,
                getDataInStore,
                securityController,
                options
            )
        ];
    }

    getUploadFileV2(prefix = '/'): FunctionsModel {
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

    getFileStorageV1(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        authController: AuthController,
        storageController: StorageController,
        filesAdapter: FilesAdapter,
        purgeNodeValue: PurgeNodeValueFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions
    ): FunctionsModel {
        return functions().onHttpRequest(`${prefix}files/:appId/:filename`, this.handleGetFile(
            securityController,
            restController,
            storageController,
            authController,
            filesAdapter,
            purgeNodeValue,
            getNodes,
            getNode,
            getDataInStore,
            options
        ));
    }

    getFileFromStorage(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        authController: AuthController,
        storageController: StorageController,
        filesAdapter: FilesAdapter,
        purgeNodeValue: PurgeNodeValueFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions
    ): FunctionsModel {
        return functions().onHttpRequest(`${prefix}storage/:appId/file/:filename`, this.handleGetFile(
            securityController,
            restController,
            storageController,
            authController,
            filesAdapter,
            purgeNodeValue,
            getNodes,
            getNode,
            getDataInStore,
            options
        ));
    }

    getFileFromStorageV2(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        authController: AuthController,
        storageController: StorageController,
        filesAdapter: FilesAdapter,
        purgeNodeValue: PurgeNodeValueFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions
    ): FunctionsModel {
        return functions().onHttpRequest(`${prefix}v2/storage/:appId/file/:filename`, this.handleGetFile(
            securityController,
            restController,
            storageController,
            authController,
            filesAdapter,
            purgeNodeValue,
            getNodes,
            getNode,
            getDataInStore,
            options
        ));
    }

    geThumbnailFromStorage(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        authController: AuthController,
        storageController: StorageController,
        filesAdapter: FilesAdapter,
        purgeNodeValue: PurgeNodeValueFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions
    ): FunctionsModel {
        return functions().onGetHttpRequest(`${prefix}storage/:appId/file/:filename/thumbnail`, this.handleGetThumbnail(
            restController,
            securityController,
            authController,
            storageController,
            filesAdapter,
            purgeNodeValue,
            getNodes,
            getNode,
            getDataInStore,
            options
        ));
    }

    geThumbnailFromStorageV2(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        authController: AuthController,
        storageController: StorageController,
        filesAdapter: FilesAdapter,
        purgeNodeValue: PurgeNodeValueFn,
        getNodes: GetNodesFn<any>,
        getNode: GetNodeFn,
        getDataInStore: GetDataFn,
        options: BFastOptions
    ): FunctionsModel {
        return functions().onGetHttpRequest(`${prefix}v2/storage/:appId/file/:filename/thumbnail`, this.handleGetThumbnail(
            restController,
            securityController,
            authController,
            storageController,
            filesAdapter,
            purgeNodeValue,
            getNodes,
            getNode,
            getDataInStore,
            options
        ));
    }

    uploadMultiPartFile(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        authController: AuthController,
        storageController: StorageController,
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
            restController,
            securityController,
            authController,
            storageController,
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

    uploadMultiPartFileV2(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        authController: AuthController,
        storageController: StorageController,
        filesAdapter: FilesAdapter,
        purgeNodeValue,
        getNodes,
        getNode,
        getDataInStore,
        upsertNode: UpsertNodeFn<any>,
        upsertDataInStore: UpsertDataFn<any>,
        options: BFastOptions
    ): FunctionsModel {
        return functions().onPostHttpRequest(`${prefix}v2/storage/:appId`, this.handleUploadFile(
            restController,
            securityController,
            authController,
            storageController,
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

    getFilesFromStorage(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        authController: AuthController,
        storageController: StorageController,
        filesAdapter: FilesAdapter,
        purgeNodeValue,
        getNodes,
        getNode,
        getDataInStore,
        options: BFastOptions
    ): FunctionsModel {
        return functions().onGetHttpRequest(`${prefix}storage/:appId/list`, this.handleListFiles(
            restController,
            securityController,
            authController,
            storageController,
            filesAdapter,
            purgeNodeValue,
            getNodes,
            getNode,
            getDataInStore,
            options
        ));
    }

    getFilesFromStorageV2(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        authController: AuthController,
        storageController: StorageController,
        filesAdapter: FilesAdapter,
        purgeNodeValue,
        getNodes,
        getNode,
        getDataInStore,
        options: BFastOptions
    ): FunctionsModel {
        return functions().onGetHttpRequest(`${prefix}v2/storage/:appId/list`, this.handleListFiles(
            restController,
            securityController,
            authController,
            storageController,
            filesAdapter,
            purgeNodeValue,
            getNodes,
            getNode,
            getDataInStore,
            options
        ));
    }
}
