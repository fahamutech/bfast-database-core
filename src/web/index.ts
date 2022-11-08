import {FunctionsModel} from '../models/functions.model';
import {FilesAdapter} from "../adapters/files";
import {BFastOptions} from "../bfast-option";
import {AuthAdapter} from "../adapters/auth";
import {
    getFileFromStorage,
    getFilesFromStorage,
    getFileV2FromStorage,
    geThumbnailFromStorage,
    geThumbnailV2FromStorage,
    getUploadFileV2,
    uploadMultiPartFile
} from "./http/storage";
import {changesRestAPI} from "./socket";
import {StorageApiModel} from "../models/storage";
import {DatabaseAdapter} from "../adapters/database";
import {handleRulesRestAPI} from "./http/rules";

export class WebServices {
    constructor(private readonly authAdapter: AuthAdapter,
                private readonly filesAdapter: FilesAdapter,
                private readonly databaseAdapter: DatabaseAdapter,
                private readonly options: BFastOptions) {
    }

    storage(prefix = '/'): StorageApiModel {
        return {
            getUploadFileV2: getUploadFileV2(prefix),
            fileApi: getFileFromStorage(
                prefix, this.filesAdapter, this.databaseAdapter, (_: any) => this.options
            ),
            fileV2Api: getFileV2FromStorage(
                prefix, this.filesAdapter, this.databaseAdapter, (_: any) => this.options
            ),
            fileThumbnailApi: geThumbnailFromStorage(
                prefix, this.filesAdapter, this.databaseAdapter, (_: any) => this.options
            ),
            fileThumbnailV2Api: geThumbnailV2FromStorage(
                prefix, this.filesAdapter, this.databaseAdapter, (_: any) => this.options
            ),
            fileListApi: getFilesFromStorage(
                prefix, this.filesAdapter, this.databaseAdapter, (_: any) => this.options
            ),
            fileUploadApi: uploadMultiPartFile(
                prefix, this.filesAdapter, this.databaseAdapter, (_: any) => this.options
            ),
        };
    }

    realtime(config: { applicationId: string, projectId: string, masterKey: string }, prefix = '/'): {
        changes: { name: string, onEvent: any },
    } {
        return {changes: changesRestAPI(config, prefix)};
    }

    rest(prefix = '/'): { rules: FunctionsModel } {
        return {
            rules: handleRulesRestAPI(
                prefix, this.authAdapter, this.filesAdapter, this.databaseAdapter, () => this.options
            )
        };
    }
}
