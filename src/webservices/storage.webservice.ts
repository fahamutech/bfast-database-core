import {BFast} from 'bfastnode';
import {RestController} from '../controllers/rest.controller';
import {FunctionsModel} from '../model/functions.model';


export class StorageWebservice {
    constructor(private readonly restController: RestController) {
    }

    private handleGetFile(): any[] {
        return [
            (request, _, next) => {
                request.body.applicationId = request.params.appId;
                request.body.ruleId = 'files.read';
                next();
            },
            (rq, rs, n) => this.restController.verifyApplicationId(rq, rs, n),
            (rq, rs, n) => this.restController.verifyToken(rq, rs, n),
            (rq, rs, n) => this.restController.filePolicy(rq, rs, n),
            (rq, rs, n) => this.restController.getFile(rq, rs, n)
        ];
    }

    private handleUploadFile(): any[] {
        return [
            (request, response, next) => {
                request.body.applicationId = request.params.appId;
                request.body.ruleId = 'files.save';
                next();
            },
            (rq, rs, n) => this.restController.verifyApplicationId(rq, rs, n),
            (rq, rs, n) => this.restController.verifyToken(rq, rs, n),
            (rq, rs, n) => this.restController.filePolicy(rq, rs, n),
            (rq, rs, n) => this.restController.multipartForm(rq, rs, n)
        ];
    }

    private handleGetThumbnail(): any[] {
        return [
            (request, _, next) => {
                request.body.applicationId = request.params.appId;
                request.body.ruleId = 'files.read';
                next();
            },
            (rq, rs, n) => this.restController.verifyApplicationId(rq, rs, n),
            (rq, rs, n) => this.restController.verifyToken(rq, rs, n),
            (rq, rs, n) => this.restController.filePolicy(rq, rs, n),
            (rq, rs, n) => this.restController.getThumbnail(rq, rs, n)
        ];
    }

    private handleListFiles(): any[] {
        return [
            (request, _, next) => {
                request.body.applicationId = request.params.appId;
                request.body.ruleId = 'files.list';
                next();
            },
            (rq, rs, n) => this.restController.verifyApplicationId(rq, rs, n),
            (rq, rs, n) => this.restController.verifyToken(rq, rs, n),
            (rq, rs, n) => this.restController.filePolicy(rq, rs, n),
            (rq, rs, n) => this.restController.getAllFiles(rq, rs, n)
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
        return BFast.functions().onGetHttpRequest(`${prefix}files/:appId/:filename`, this.handleGetFile());
    }

    getFileFromStorage(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}storage/:appId/file/:filename`, this.handleGetFile());
    }

    getFileFromStorageV2(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}v2/storage/:appId/file/:filename`, this.handleGetFile());
    }

    geThumbnailFromStorage(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}storage/:appId/file/:filename/thumbnail`, this.handleGetThumbnail());
    }

    geThumbnailFromStorageV2(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}v2/storage/:appId/file/:filename/thumbnail`, this.handleGetThumbnail());
    }

    uploadMultiPartFile(prefix = '/'): FunctionsModel {
        return BFast.functions().onPostHttpRequest(`${prefix}storage/:appId`, this.handleUploadFile());
    }

    uploadMultiPartFileV2(prefix = '/'): FunctionsModel {
        return BFast.functions().onPostHttpRequest(`${prefix}v2/storage/:appId`, this.handleUploadFile());
    }

    getFilesFromStorage(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}storage/:appId/list`, this.handleListFiles());
    }

    getFilesFromStorageV2(prefix = '/'): FunctionsModel {
        return BFast.functions().onGetHttpRequest(`${prefix}v2/storage/:appId/list`, this.handleListFiles());
    }
}
