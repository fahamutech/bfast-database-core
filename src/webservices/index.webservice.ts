import {FunctionsModel} from '../model/functions.model';
import {StorageApiModel} from '../model/storage-api.model';
import {FilesAdapter} from "../adapters/files.adapter";
import {BFastOptions} from "../bfast-database.option";
import {AuthAdapter} from "../adapters/auth.adapter";
import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn,
    PurgeNodeValueFn,
    UpsertDataFn,
    UpsertNodeFn
} from "../adapters/database.adapter";
import {
    getFileFromStorage,
    getFilesFromStorage,
    geThumbnailFromStorage,
    getUploadFileV2,
    uploadMultiPartFile
} from "./storage.webservice";
import {changesRestAPI} from "./changes.webservice";
import {authJwk, rulesRestAPI} from "./rest.webservice";

export class WebServices {
    constructor(private readonly authAdapter: AuthAdapter,
                private readonly filesAdapter: FilesAdapter,
                private readonly getNodes: GetNodesFn<any>,
                private readonly getNode: GetNodeFn,
                private readonly getDataInStore: GetDataFn,
                private readonly upsertNode: UpsertNodeFn<any>,
                private readonly upsertDataInStore: UpsertDataFn<any>,
                private readonly purgeNodeValue: PurgeNodeValueFn,
                private readonly options: BFastOptions) {
    }

    storage(prefix = '/'): StorageApiModel {
        return {
            fileApi: getFileFromStorage(
                prefix,
                this.filesAdapter,
                this.purgeNodeValue,
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.options
            ),
            fileThumbnailApi: geThumbnailFromStorage(
                prefix,
                this.filesAdapter,
                this.purgeNodeValue,
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.options
            ),
            fileListApi: getFilesFromStorage(
                prefix,
                this.filesAdapter,
                this.purgeNodeValue,
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.options
            ),
            fileUploadApi: uploadMultiPartFile(
                prefix,
                this.filesAdapter,
                this.purgeNodeValue,
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.upsertNode,
                this.upsertDataInStore,
                this.options
            ),
            getUploadFileV2: getUploadFileV2(prefix),
        };
    }

    realtime(config: { applicationId: string, masterKey: string }, prefix = '/'): {
        changes: { name: string, onEvent: any },
        // syncs: { name: string, onEvent: any },
        // syncsEndpoint: { name: string, onEvent: any }
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
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.upsertNode,
                this.upsertDataInStore,
                this.purgeNodeValue,
                this.options
            ),
            jwk: authJwk(
                this.options
            ),
        };
    }
}
