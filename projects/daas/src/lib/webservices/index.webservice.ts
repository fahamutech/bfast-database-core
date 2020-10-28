import {RestWebservice} from './rest.webservice';
import {RealtimeWebservice} from './realtime.webservice';
import {StorageWebservice} from './storage.webservice';

export class WebServices {
  constructor(private readonly restWebservice: RestWebservice,
              private readonly realtimeWebservice: RealtimeWebservice,
              private readonly storageWebservice: StorageWebservice) {
  }

  storage(): any {
    return {
      fileV1Api: this.storageWebservice.getFileStorageV1(),
      fileApi: this.storageWebservice.getFileFromStorage(),
      fileV2Api: this.storageWebservice.getFileFromStorageV2(),
      fileThumbnailApi: this.storageWebservice.geThumbnailFromStorage(),
      fileThumbnailV2Api: this.storageWebservice.geThumbnailFromStorageV2(),
      fileListApi: this.storageWebservice.getFilesFromStorage(),
      fileListV2Api: this.storageWebservice.getFilesFromStorageV2(),
      fileUploadApi: this.storageWebservice.uploadMultiPartFile(),
      fileUploadV2Api: this.storageWebservice.uploadMultiPartFileV2(),
    };
  }

  realtime(config: { applicationId: string, masterKey: string }): any {
    return {
      changes: this.realtimeWebservice.changesV2(config)
    };
  }

  rest(): any {
    return {
      rules: this.restWebservice.rulesV2()
    };
  }
}
