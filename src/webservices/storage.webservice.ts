import {BFast} from 'bfastnode';
import {RestController} from '../controllers/rest.controller';
import {FunctionsModel} from '../model/functions.model';


// export const onUploadMultiPartFile = BFast.functions().onGetHttpRequest('/storage/:appId',
//     (request, response: any) => {
//         // show a file upload form
//         response.writeHead(200, {'content-type': 'text/html'});
//         response.end(`
//     <h2>With Node.js <code>"http"</code> module</h2>
//     <form action="/storage/daas" enctype="multipart/form-data" method="post">
//       <div>Text field title: <input type="text" name="title" /></div>
//       <div>File: <input type="file" name="multipleFiles" multiple="multiple" /></div>
//       <input type="submit" value="Upload" />
//     </form>
//   `);
// });

let restController: RestController;

// @dynamic
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

  getFileStorageV1(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/files/:appId/:filename', StorageWebservice.handleGetFile());
  }

  getFileFromStorage(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/storage/:appId/file/:filename', StorageWebservice.handleGetFile());
  }

  getFileFromStorageV2(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/v2/storage/:appId/file/:filename', StorageWebservice.handleGetFile());
  }

  uploadMultiPartFile(): FunctionsModel {
    return BFast.functions().onPostHttpRequest('/storage/:appId', StorageWebservice.handleUploadFile());
  }

  uploadMultiPartFileV2(): FunctionsModel {
    return BFast.functions().onPostHttpRequest('/v2/storage/:appId', StorageWebservice.handleUploadFile());
  }

  geThumbnailFromStorage(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/storage/:appId/thumbnail/:filename', StorageWebservice.handleGetThumbnail());
  }

  geThumbnailFromStorageV2(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/v2/storage/:appId/thumbnail/:filename', StorageWebservice.handleGetThumbnail());
  }

  getFilesFromStorage(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/storage/:appId/list', StorageWebservice.handleListFiles());
  }

  getFilesFromStorageV2(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/v2/storage/:appId/list', StorageWebservice.handleListFiles());
  }
}
