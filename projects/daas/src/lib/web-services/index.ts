import {
    getFileFromStorage,
    getFileFromStorageV2,
    getFilesFromStorage,
    getFilesFromStorageV2,
    getFileStorageV1,
    geThumbnailFromStorage,
    geThumbnailFromStorageV2,
    uploadMultiPartFile,
    uploadMultiPartFileV2
} from "./storage";
import {domainChangesListener} from "./realtime";
import {bfastRulesEndpoint} from "./rest";

export class WebServices {
    storage() {
        return {
            fileV1Api: getFileStorageV1,
            fileApi: getFileFromStorage,
            fileV2Api: getFileFromStorageV2,
            fileThumbnailApi: geThumbnailFromStorage,
            fileThumbnailV2Api: geThumbnailFromStorageV2,
            fileListApi: getFilesFromStorage,
            fileListV2Api: getFilesFromStorageV2,
            fileUploadApi: uploadMultiPartFile,
            fileUploadV2Api: uploadMultiPartFileV2,
        }
    }

    realtime() {
        return {
            changes: domainChangesListener
        }
    }

    rest(){
        return{
            rules: bfastRulesEndpoint
        }
    }
}
