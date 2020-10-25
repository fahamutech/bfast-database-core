import {BFast} from "bfastnode";
import {getRestController} from "./webServicesConfig";

const restController = getRestController();

const handleUploadFile = [
    (request, response, next) => {
        request.body.applicationId = request.params.appId;
        request.body.ruleId = 'files.save'
        next();
    },
    restController.applicationId,
    restController.verifyToken,
    restController.filePolicy,
    restController.multipartForm
];

const handleGetFile = [
    (request, _, next) => {
        request.body.applicationId = request.params.appId;
        request.body.ruleId = 'files.read'
        next();
    },
    restController.applicationId,
    restController.verifyToken,
    restController.filePolicy,
    restController.getFile
];

const handleGetThumbnail = [
    (request, _, next) => {
        request.body.applicationId = request.params.appId;
        request.body.ruleId = 'files.read'
        next();
    },
    restController.applicationId,
    restController.verifyToken,
    restController.filePolicy,
    restController.getThumbnail
];

const handleListFiles = [
    (request, _, next) => {
        request.body.applicationId = request.params.appId;
        request.body.ruleId = 'files.list'
        next();
    },
    restController.applicationId,
    restController.verifyToken,
    restController.filePolicy,
    restController.getAllFiles
];

export const getFileStorageV1 =
    BFast.functions().onGetHttpRequest('/files/:appId/:filename', handleGetFile)

/**
 * get file uploaded to server
 */
export const getFileFromStorage =
    BFast.functions().onGetHttpRequest('/storage/:appId/file/:filename', handleGetFile);
export const getFileFromStorageV2 =
    BFast.functions().onGetHttpRequest('/v2/storage/:appId/file/:filename', handleGetFile);

/**
 * get thumbnail of image
 */
export const geThumbnailFromStorage =
    BFast.functions().onGetHttpRequest('/storage/:appId/thumbnail/:filename', handleGetThumbnail);
export const geThumbnailFromStorageV2 =
    BFast.functions().onGetHttpRequest('/v2/storage/:appId/thumbnail/:filename', handleGetThumbnail);

/**
 * list all files in server
 */
export const getFilesFromStorage =
    BFast.functions().onGetHttpRequest('/storage/:appId/list', handleListFiles);
export const getFilesFromStorageV2 =
    BFast.functions().onGetHttpRequest('/v2/storage/:appId/list', handleListFiles);

export const uploadMultiPartFile =
    BFast.functions().onPostHttpRequest('/storage/:appId', handleUploadFile);
export const uploadMultiPartFileV2 =
    BFast.functions().onPostHttpRequest('/v2/storage/:appId', handleUploadFile);


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
