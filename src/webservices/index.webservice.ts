import {RestWebservice} from './rest.webservice';
import {RealtimeWebservice} from './realtime.webservice';
import {StorageWebservice} from './storage.webservice';
import {FunctionsModel} from '../model/functions.model';
import {StorageApiModel} from '../model/storage-api.model';

export class WebServices {
    constructor(private readonly restWebservice: RestWebservice,
                private readonly realtimeWebservice: RealtimeWebservice,
                private readonly storageWebservice: StorageWebservice) {
    }

    storage(prefix = '/'): StorageApiModel {
        return {
            fileV1Api: this.storageWebservice.getFileStorageV1(prefix),
            fileApi: this.storageWebservice.getFileFromStorage(prefix),
            fileV2Api: this.storageWebservice.getFileFromStorageV2(prefix),
            fileThumbnailApi: this.storageWebservice.geThumbnailFromStorage(prefix),
            fileThumbnailV2Api: this.storageWebservice.geThumbnailFromStorageV2(prefix),
            fileListApi: this.storageWebservice.getFilesFromStorage(prefix),
            fileListV2Api: this.storageWebservice.getFilesFromStorageV2(prefix),
            fileUploadApi: this.storageWebservice.uploadMultiPartFile(prefix),
            fileUploadV2Api: this.storageWebservice.uploadMultiPartFileV2(prefix),
            getUploadFileV2: this.storageWebservice.getUploadFileV2(prefix),
        };
    }

    realtime(config: { applicationId: string, masterKey: string }, prefix = '/'): { changes: { name: string, onEvent: any } } {
        return {
            changes: this.realtimeWebservice.changesV2(config, prefix)
        };
    }

    rest(prefix = '/'): { rules: FunctionsModel, jwk: FunctionsModel } {
        return {
            rules: this.restWebservice.rulesV2(prefix),
            jwk: this.restWebservice.authJwk(),
        };
    }
}
