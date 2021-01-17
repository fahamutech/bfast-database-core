import {FunctionsModel} from './functions.model';

export interface StorageApiModel{
    fileV1Api?: FunctionsModel;
    fileApi?: FunctionsModel;
    fileV2Api?: FunctionsModel,
    fileThumbnailApi?: FunctionsModel;
    fileThumbnailV2Api?: FunctionsModel;
    fileListApi?: FunctionsModel;
    fileListV2Api?: FunctionsModel;
    fileUploadApi?: FunctionsModel;
    fileUploadV2Api?: FunctionsModel;
    getUploadFileV2?: FunctionsModel;
}
