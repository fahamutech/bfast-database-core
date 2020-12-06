import {RestWebservice} from './rest.webservice';
import {RealtimeWebservice} from './realtime.webservice';
import {StorageWebservice} from './storage.webservice';

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

  storage(): any {
    return {
      fileV1Api: storageWebservice.getFileStorageV1(),
      fileApi: storageWebservice.getFileFromStorage(),
      fileV2Api: storageWebservice.getFileFromStorageV2(),
      fileThumbnailApi: storageWebservice.geThumbnailFromStorage(),
      fileThumbnailV2Api: storageWebservice.geThumbnailFromStorageV2(),
      fileListApi: storageWebservice.getFilesFromStorage(),
      fileListV2Api: storageWebservice.getFilesFromStorageV2(),
      fileUploadApi: storageWebservice.uploadMultiPartFile(),
      fileUploadV2Api: storageWebservice.uploadMultiPartFileV2(),
      getUploadFileV2: storageWebservice.getUploadFileV2(),
    };
  }

  realtime(config: { applicationId: string, masterKey: string }): any {
    return {
      changes: realtimeWebservice.changesV2(config)
    };
  }

  rest(): any {
    return {
      rules: restWebservice.rulesV2()
    };
  }
}
