import {FunctionsModel} from "./functions.model";

export type Storage<T> = {
    id: string,
    name: string,
    extension: string,
    type: string,
    cid: string,
    size: number,
    data: T
}

export type StorageApiModel = {
    fileApi: FunctionsModel;
    fileV2Api: FunctionsModel,
    fileThumbnailApi: FunctionsModel;
    fileThumbnailV2Api: FunctionsModel,
    fileListApi: FunctionsModel;
    fileUploadApi: FunctionsModel;
    getUploadFileV2: FunctionsModel;
}

export type ListFileQuery = {
    skip: number;
    after: string;
    size: number;
    prefix: string;
}