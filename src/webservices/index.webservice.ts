import {FunctionsModel} from '../models/functions.model';
import {StorageApiModel} from '../models/storage-api.model';
import {FilesAdapter} from "../adapters/files.adapter";
import {BFastOptions} from "../bfast-database.option";
import {AuthAdapter} from "../adapters/auth.adapter";
import {
    getFileFromStorage,
    getFilesFromStorage, getFileV2FromStorage,
    geThumbnailFromStorage, geThumbnailV2FromStorage,
    getUploadFileV2,
    uploadMultiPartFile
} from "./storage.webservice";
import {changesRestAPI} from "./changes.webservice";
import {authJwk, rulesRestAPI} from "./rest.webservice";

export class WebServices {
    constructor(private readonly authAdapter: AuthAdapter,
                private readonly filesAdapter: FilesAdapter,
                private readonly options: BFastOptions) {
    }

    storage(prefix = '/'): StorageApiModel {
        return {
            fileApi: getFileFromStorage(prefix, this.filesAdapter, this.options),
            fileV2Api: getFileV2FromStorage(prefix, this.filesAdapter, this.options),
            fileThumbnailApi: geThumbnailFromStorage(prefix, this.filesAdapter, this.options),
            fileThumbnailV2Api: geThumbnailV2FromStorage(prefix, this.filesAdapter, this.options),
            fileListApi: getFilesFromStorage(prefix, this.filesAdapter, this.options),
            fileUploadApi: uploadMultiPartFile(prefix, this.filesAdapter, this.options),
            getUploadFileV2: getUploadFileV2(prefix)
        };
    }

    realtime(config: { applicationId: string, projectId: string, masterKey: string }, prefix = '/'): {
        changes: { name: string, onEvent: any },
    } {
        return {
            changes: changesRestAPI(config, prefix)
        };
    }

    rest(prefix = '/'): { rules: FunctionsModel, jwk: FunctionsModel } {
        return {
            rules: rulesRestAPI(
                prefix,
                this.authAdapter,
                this.filesAdapter,
                this.options
            ),
            jwk: authJwk(
                this.options
            ),
        };
    }
}
