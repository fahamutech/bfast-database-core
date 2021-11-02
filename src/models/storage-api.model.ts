import {FunctionsModel} from './functions.model';

export interface StorageApiModel{
    fileApi: FunctionsModel;
    fileV2Api: FunctionsModel,
    fileThumbnailApi: FunctionsModel;
    fileThumbnailV2Api: FunctionsModel,
    fileListApi: FunctionsModel;
    fileUploadApi: FunctionsModel;
    getUploadFileV2: FunctionsModel;
}
