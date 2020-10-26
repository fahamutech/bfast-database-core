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
      this.restController.verifyApplicationId,
      this.restController.verifyToken,
      this.restController.filePolicy,
      this.restController.getFile
    ];
  }

  private handleUploadFile(): any[] {
    return [
      (request, response, next) => {
        request.body.applicationId = request.params.appId;
        request.body.ruleId = 'files.save';
        next();
      },
      this.restController.verifyApplicationId,
      this.restController.verifyToken,
      this.restController.filePolicy,
      this.restController.multipartForm
    ];
  }

  private handleGetThumbnail(): any[] {
    return [
      (request, _, next) => {
        request.body.applicationId = request.params.appId;
        request.body.ruleId = 'files.read';
        next();
      },
      this.restController.verifyApplicationId,
      this.restController.verifyToken,
      this.restController.filePolicy,
      this.restController.getThumbnail
    ];
  }

  private handleListFiles(): any[] {
    return [
      (request, _, next) => {
        request.body.applicationId = request.params.appId;
        request.body.ruleId = 'files.list';
        next();
      },
      this.restController.verifyApplicationId,
      this.restController.verifyToken,
      this.restController.filePolicy,
      this.restController.getAllFiles
    ];
  }

  getFileStorageV1(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/files/:appId/:filename', this.handleGetFile());
  }

  getFileFromStorage(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/storage/:appId/file/:filename', this.handleGetFile());
  }

  getFileFromStorageV2(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/v2/storage/:appId/file/:filename', this.handleGetFile());
  }

  uploadMultiPartFile(): FunctionsModel {
    return BFast.functions().onPostHttpRequest('/storage/:appId', this.handleUploadFile());
  }

  uploadMultiPartFileV2(): FunctionsModel {
    return BFast.functions().onPostHttpRequest('/v2/storage/:appId', this.handleUploadFile());
  }

  geThumbnailFromStorage(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/storage/:appId/thumbnail/:filename', this.handleGetThumbnail());
  }

  geThumbnailFromStorageV2(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/v2/storage/:appId/thumbnail/:filename', this.handleGetThumbnail());
  }

  getFilesFromStorage(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/storage/:appId/list', this.handleListFiles());
  }

  getFilesFromStorageV2(): FunctionsModel {
    return BFast.functions().onGetHttpRequest('/v2/storage/:appId/list', this.handleListFiles());
  }
}
