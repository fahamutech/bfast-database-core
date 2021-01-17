import {RestWebservice} from './rest.webservice';
import {RealtimeWebservice} from './realtime.webservice';
import {StorageWebservice} from './storage.webservice';
import {FunctionsModel} from '../model/functions.model';
import {StorageApiModel} from '../model/storage-api.model';

let restWebservice: RestWebservice;
let realtimeWebservice: RealtimeWebservice;
let storageWebservice: StorageWebservice;

export class WebServices {
    constructor(rest: RestWebservice,
                realtime: RealtimeWebservice,
                storage: StorageWebservice) {
        restWebservice = rest;
        realtimeWebservice = realtime;
        storageWebservice = storage;
    }

    storage(prefix = '/'): StorageApiModel {
        return {
            fileV1Api: storageWebservice.getFileStorageV1(prefix),
            fileApi: storageWebservice.getFileFromStorage(prefix),
            fileV2Api: storageWebservice.getFileFromStorageV2(prefix),
            fileThumbnailApi: storageWebservice.geThumbnailFromStorage(prefix),
            fileThumbnailV2Api: storageWebservice.geThumbnailFromStorageV2(prefix),
            fileListApi: storageWebservice.getFilesFromStorage(prefix),
            fileListV2Api: storageWebservice.getFilesFromStorageV2(prefix),
            fileUploadApi: storageWebservice.uploadMultiPartFile(prefix),
            fileUploadV2Api: storageWebservice.uploadMultiPartFileV2(prefix),
            getUploadFileV2: storageWebservice.getUploadFileV2(prefix),
        };
    }

    realtime(config: { applicationId: string, masterKey: string }, prefix = '/'): { changes: { name: string, onEvent: any } } {
        return {
            changes: realtimeWebservice.changesV2(config, prefix)
        };
    }

    rest(prefix = '/'): { rules: FunctionsModel } {
        return {
            rules: restWebservice.rulesV2(prefix)
        };
    }
}
