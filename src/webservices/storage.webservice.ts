import {functions} from 'bfast';
import {FunctionsModel} from '../model/functions.model';
import {RestController} from "../controllers/rest.controller";
import {BFastDatabaseOptions} from "../bfast-database.option";
import {SecurityController} from "../controllers/security.controller";
import {DatabaseController} from "../controllers/database.controller";
import {DatabaseAdapter} from "../adapters/database.adapter";
import {AuthController} from "../controllers/auth.controller";
import {StorageController} from "../controllers/storage.controller";
import {FilesAdapter} from "../adapters/files.adapter";


export class StorageWebservice {
    constructor() {
    }

    handleGetFile(
        securityController: SecurityController,
        restController: RestController,
        databaseController: DatabaseController,
        storageController: StorageController,
        authController: AuthController,
        databaseAdapter: DatabaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions
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
                    databaseController,
                    securityController,
                    databaseAdapter,
                    authController,
                    options
                ),
            (rq, rs, n) => restController
                .getFile(
                    rq,
                    rs,
                    n,
                    storageController,
                    databaseAdapter,
                    filesAdapter,
                    options
                )
        ];
    }

    handleUploadFile(
        restController: RestController,
        securityController: SecurityController,
        databaseController: DatabaseController,
        authController: AuthController,
        storageController: StorageController,
        databaseAdapter: DatabaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions
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
                    databaseController,
                    securityController,
                    databaseAdapter,
                    authController,
                    options
                ),
            (rq, rs, n) => restController
                .multipartForm(
                    rq,
                    rs,
                    n,
                    storageController,
                    securityController,
                    databaseAdapter,
                    filesAdapter,
                    options
                )
        ];
    }

    handleGetThumbnail(
        restController: RestController,
        securityController: SecurityController,
        databaseController: DatabaseController,
        authController: AuthController,
        storageController: StorageController,
        databaseAdapter: DatabaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions
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
                    databaseController,
                    securityController,
                    databaseAdapter,
                    authController,
                    options
                ),
            (rq, rs, n) => restController.getThumbnail(
                rq,
                rs,
                n,
                storageController,
                databaseAdapter,
                filesAdapter,
                options
            )
        ];
    }

    handleListFiles(
        restController: RestController,
        securityController: SecurityController,
        databaseController: DatabaseController,
        authController: AuthController,
        storageController: StorageController,
        databaseAdapter: DatabaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions
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
                    databaseController,
                    securityController,
                    databaseAdapter,
                    authController,
                    options
                ),
            (rq, rs, n) => restController.getAllFiles(
                rq,
                rs,
                n,
                storageController,
                databaseAdapter,
                filesAdapter,
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
        databaseController: DatabaseController,
        authController: AuthController,
        storageController: StorageController,
        databaseAdapter: DatabaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions
    ): FunctionsModel {
        return functions().onHttpRequest(`${prefix}files/:appId/:filename`, this.handleGetFile(
            securityController,
            restController,
            databaseController,
            storageController,
            authController,
            databaseAdapter,
            filesAdapter,
            options
        ));
    }

    getFileFromStorage(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        databaseController: DatabaseController,
        authController: AuthController,
        storageController: StorageController,
        databaseAdapter: DatabaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions
    ): FunctionsModel {
        return functions().onHttpRequest(`${prefix}storage/:appId/file/:filename`, this.handleGetFile(
            securityController,
            restController,
            databaseController,
            storageController,
            authController,
            databaseAdapter,
            filesAdapter,
            options
        ));
    }

    getFileFromStorageV2(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        databaseController: DatabaseController,
        authController: AuthController,
        storageController: StorageController,
        databaseAdapter: DatabaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions
    ): FunctionsModel {
        return functions().onHttpRequest(`${prefix}v2/storage/:appId/file/:filename`, this.handleGetFile(
            securityController,
            restController,
            databaseController,
            storageController,
            authController,
            databaseAdapter,
            filesAdapter,
            options
        ));
    }

    geThumbnailFromStorage(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        databaseController: DatabaseController,
        authController: AuthController,
        storageController: StorageController,
        databaseAdapter: DatabaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions
    ): FunctionsModel {
        return functions().onGetHttpRequest(`${prefix}storage/:appId/file/:filename/thumbnail`, this.handleGetThumbnail(
            restController,
            securityController,
            databaseController,
            authController,
            storageController,
            databaseAdapter,
            filesAdapter,
            options
        ));
    }

    geThumbnailFromStorageV2(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        databaseController: DatabaseController,
        authController: AuthController,
        storageController: StorageController,
        databaseAdapter: DatabaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions
    ): FunctionsModel {
        return functions().onGetHttpRequest(`${prefix}v2/storage/:appId/file/:filename/thumbnail`, this.handleGetThumbnail(
            restController,
            securityController,
            databaseController,
            authController,
            storageController,
            databaseAdapter,
            filesAdapter,
            options
        ));
    }

    uploadMultiPartFile(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        databaseController: DatabaseController,
        authController: AuthController,
        storageController: StorageController,
        databaseAdapter: DatabaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions
    ): FunctionsModel {
        return functions().onPostHttpRequest(`${prefix}storage/:appId`, this.handleUploadFile(
            restController,
            securityController,
            databaseController,
            authController,
            storageController,
            databaseAdapter,
            filesAdapter,
            options
        ));
    }

    uploadMultiPartFileV2(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        databaseController: DatabaseController,
        authController: AuthController,
        storageController: StorageController,
        databaseAdapter: DatabaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions
    ): FunctionsModel {
        return functions().onPostHttpRequest(`${prefix}v2/storage/:appId`, this.handleUploadFile(
            restController,
            securityController,
            databaseController,
            authController,
            storageController,
            databaseAdapter,
            filesAdapter,
            options
        ));
    }

    getFilesFromStorage(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        databaseController: DatabaseController,
        authController: AuthController,
        storageController: StorageController,
        databaseAdapter: DatabaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions
    ): FunctionsModel {
        return functions().onGetHttpRequest(`${prefix}storage/:appId/list`, this.handleListFiles(
            restController,
            securityController,
            databaseController,
            authController,
            storageController,
            databaseAdapter,
            filesAdapter,
            options
        ));
    }

    getFilesFromStorageV2(
        prefix = '/',
        restController: RestController,
        securityController: SecurityController,
        databaseController: DatabaseController,
        authController: AuthController,
        storageController: StorageController,
        databaseAdapter: DatabaseAdapter,
        filesAdapter: FilesAdapter,
        options: BFastDatabaseOptions
    ): FunctionsModel {
        return functions().onGetHttpRequest(`${prefix}v2/storage/:appId/list`, this.handleListFiles(
            restController,
            securityController,
            databaseController,
            authController,
            storageController,
            databaseAdapter,
            filesAdapter,
            options
        ));
    }
}
