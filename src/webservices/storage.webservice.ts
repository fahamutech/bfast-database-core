import {BFast} from 'bfastnode';
import {RestController} from '../controllers/rest.controller';
import {FunctionsModel} from '../model/functions.model';


let restController: RestController;

export class StorageWebservice {
    constructor(rest: RestController) {
        restController = rest;
    }

    private static handleGetFile(): any[] {
        return [
            (request, _, next) => {
                request.body.applicationId = request.params.appId;
                request.body.ruleId = 'files.read';
                next();
            },
            restController.verifyApplicationId,
            restController.verifyToken,
            restController.filePolicy,
            restController.getFile
        ];
    }

    private static handleUploadFile(): any[] {
        return [
            (request, response, next) => {
                request.body.applicationId = request.params.appId;
                request.body.ruleId = 'files.save';
                next();
            },
            restController.verifyApplicationId,
            restController.verifyToken,
            restController.filePolicy,
            restController.multipartForm
        ];
    }

    private static handleGetThumbnail(): any[] {
        return [
            (request, _, next) => {
                request.body.applicationId = request.params.appId;
                request.body.ruleId = 'files.read';
                next();
            },
            restController.verifyApplicationId,
            restController.verifyToken,
            restController.filePolicy,
            restController.getThumbnail
        ];
    }

    private static handleListFiles(): any[] {
        return [
            (request, _, next) => {
                request.body.applicationId = request.params.appId;
                request.body.ruleId = 'files.list';
                next();
            },
            restController.verifyApplicationId,
            restController.verifyToken,
            restController.filePolicy,
            restController.getAllFiles
        ];
    }

    getUploadFileV2(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}storage/:appId`,
            (request, response: any) => {
                // show a file upload form
                response.writeHead(200, {'content-type': 'text/html'});
                response.end(`
                    <h2>With Node.js <code>"http"</code> module</h2>
                    <form action="${prefix}storage/${request.params.appId}" enctype="multipart/form-data" method="post">
                      <div>Text field title: <input type="text" name="file" /></div>
                      <div>File: <input type="file" name="multipleFiles" multiple="multiple" /></div>
                      <input type="submit" value="Upload" />
                    </form>
                 `);
            });
    }

    getFileStorageV1(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}files/:appId/:filename`, StorageWebservice.handleGetFile());
    }

    getFileFromStorage(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}storage/:appId/file/:filename`, StorageWebservice.handleGetFile());
    }

    getFileFromStorageV2(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}v2/storage/:appId/file/:filename`, StorageWebservice.handleGetFile());
    }

    geThumbnailFromStorage(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}storage/:appId/file/:filename/thumbnail`, StorageWebservice.handleGetThumbnail());
    }

    geThumbnailFromStorageV2(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}v2/storage/:appId/file/:filename/thumbnail`, StorageWebservice.handleGetThumbnail());
    }

    uploadMultiPartFile(prefix = '/'): FunctionsModel {
        return BFast.functions().onPostHttpRequest(`${prefix}storage/:appId`, StorageWebservice.handleUploadFile());
    }

    uploadMultiPartFileV2(prefix = '/'): FunctionsModel {
        return BFast.functions().onPostHttpRequest(`${prefix}v2/storage/:appId`, StorageWebservice.handleUploadFile());
    }

    getFilesFromStorage(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}storage/:appId/list`, StorageWebservice.handleListFiles());
    }

    getFilesFromStorageV2(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}v2/storage/:appId/list`, StorageWebservice.handleListFiles());
    }
}
