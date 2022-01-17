import {FunctionsModel} from '../models/functions.model';
import {FilesAdapter} from "../adapters/files";
import {BFastOptions} from "../bfast-option";
import {AuthAdapter} from "../adapters/auth";
import {
    getFileFromStorage,
    getFilesFromStorage, getFileV2FromStorage,
    geThumbnailFromStorage, geThumbnailV2FromStorage,
    getUploadFileV2,
    uploadMultiPartFile
} from "./storage";
import {changesRestAPI} from "./changes";
import {authJwk, rulesRestAPI} from "./rules";
import {StorageApiModel} from "../models/storage";
import {DatabaseAdapter} from "../adapters/database";

export class WebServices {
    constructor(private readonly authAdapter: AuthAdapter,
                private readonly filesAdapter: FilesAdapter,
                private readonly databaseAdapter: DatabaseAdapter,
                private readonly options: BFastOptions) {
    }

    storage(prefix = '/'): StorageApiModel {
        return {
            getUploadFileV2: getUploadFileV2(prefix),
            fileApi: getFileFromStorage(prefix, this.filesAdapter, this.databaseAdapter, this.options),
            fileV2Api: getFileV2FromStorage(prefix, this.filesAdapter, this.databaseAdapter, this.options),
            fileThumbnailApi: geThumbnailFromStorage(prefix, this.filesAdapter, this.databaseAdapter, this.options),
            fileThumbnailV2Api: geThumbnailV2FromStorage(prefix, this.filesAdapter, this.databaseAdapter, this.options),
            fileListApi: getFilesFromStorage(prefix, this.filesAdapter, this.databaseAdapter, this.options),
            fileUploadApi: uploadMultiPartFile(prefix, this.filesAdapter, this.databaseAdapter, this.options),
        };
    }

    realtime(config: { applicationId: string, projectId: string, masterKey: string }, prefix = '/'): {
        changes: { name: string, onEvent: any },
    } {
        return {changes: changesRestAPI(config, prefix)};
    }

    rest(prefix = '/'): { rules: FunctionsModel, jwk: FunctionsModel } {
        return {
            rules: rulesRestAPI(prefix, this.authAdapter, this.filesAdapter, this.databaseAdapter, this.options),
            jwk: authJwk(this.options)
        };
    }
}
