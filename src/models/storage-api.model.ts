import {FunctionsModel} from './functions.model';

export interface StorageApiModel{
    fileApi: FunctionsModel;
    fileThumbnailApi: FunctionsModel;
    fileListApi: FunctionsModel;
    fileUploadApi: FunctionsModel;
    getUploadFileV2: FunctionsModel;
}
