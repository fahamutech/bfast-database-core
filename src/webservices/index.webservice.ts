import {RestWebservice} from './rest.webservice';
import {ChangesWebservice} from './changes.webservice';
import {StorageWebservice} from './storage.webservice';
import {FunctionsModel} from '../model/functions.model';
import {StorageApiModel} from '../model/storage-api.model';
import {RestController} from "../controllers/rest.controller";
import {SecurityController} from "../controllers/security.controller";
import {AuthController} from "../controllers/auth.controller";
import {StorageController} from "../controllers/storage.controller";
import {FilesAdapter} from "../adapters/files.adapter";
import {BFastOptions} from "../bfast-database.option";
import {RulesController} from "../controllers/rules.controller";
import {UpdateRuleController} from "../controllers/update.rule.controller";
import {AuthAdapter} from "../adapters/auth.adapter";
import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn,
    PurgeNodeValueFn,
    UpsertDataFn,
    UpsertNodeFn
} from "../adapters/database.adapter";

export class WebServices {
    constructor(private readonly restController: RestController,
                private readonly rulesController: RulesController,
                private readonly updateRuleController: UpdateRuleController,
                private readonly securityController: SecurityController,
                private readonly authController: AuthController,
                private readonly storageController: StorageController,
                private readonly authAdapter: AuthAdapter,
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
        const storageWebservice = new StorageWebservice();
        return {
            fileV1Api: storageWebservice.getFileStorageV1(
                prefix,
                this.restController,
                this.securityController,
                this.authController,
                this.storageController,
                this.filesAdapter,
                this.purgeNodeValue,
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.options
            ),
            fileApi: storageWebservice.getFileFromStorage(
                prefix,
                this.restController,
                this.securityController,
                this.authController,
                this.storageController,
                this.filesAdapter,
                this.purgeNodeValue,
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.options
            ),
            fileV2Api: storageWebservice.getFileFromStorageV2(
                prefix,
                this.restController,
                this.securityController,
                this.authController,
                this.storageController,
                this.filesAdapter,
                this.purgeNodeValue,
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.options
            ),
            fileThumbnailApi: storageWebservice.geThumbnailFromStorage(
                prefix,
                this.restController,
                this.securityController,
                this.authController,
                this.storageController,
                this.filesAdapter,
                this.purgeNodeValue,
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.options
            ),
            fileThumbnailV2Api: storageWebservice.geThumbnailFromStorageV2(
                prefix,
                this.restController,
                this.securityController,
                this.authController,
                this.storageController,
                this.filesAdapter,
                this.purgeNodeValue,
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.options
            ),
            fileListApi: storageWebservice.getFilesFromStorage(
                prefix,
                this.restController,
                this.securityController,
                this.authController,
                this.storageController,
                this.filesAdapter,
                this.purgeNodeValue,
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.options
            ),
            fileListV2Api: storageWebservice.getFilesFromStorageV2(
                prefix,
                this.restController,
                this.securityController,
                this.authController,
                this.storageController,
                this.filesAdapter,
                this.purgeNodeValue,
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.options
            ),
            fileUploadApi: storageWebservice.uploadMultiPartFile(
                prefix,
                this.restController,
                this.securityController,
                this.authController,
                this.storageController,
                this.filesAdapter,
                this.purgeNodeValue,
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.upsertNode,
                this.upsertDataInStore,
                this.options
            ),
            fileUploadV2Api: storageWebservice.uploadMultiPartFileV2(
                prefix,
                this.restController,
                this.securityController,
                this.authController,
                this.storageController,
                this.filesAdapter,
                this.purgeNodeValue,
                this.getNodes,
                this.getNode,
                this.getDataInStore,
                this.upsertNode,
                this.upsertDataInStore,
                this.options
            ),
            getUploadFileV2: storageWebservice.getUploadFileV2(prefix),
        };
    }

    realtime(config: { applicationId: string, masterKey: string }, prefix = '/'): {
        changes: { name: string, onEvent: any },
        // syncs: { name: string, onEvent: any },
        // syncsEndpoint: { name: string, onEvent: any }
    } {
        const changesWebService = new ChangesWebservice();
        return {
            changes: changesWebService.changes(config, prefix, this.securityController,)
        };
    }

    rest(prefix = '/'): { rules: FunctionsModel, jwk: FunctionsModel } {
        const restWebService = new RestWebservice();
        return {
            rules: restWebService.rulesV2(
                prefix,
                this.securityController,
                this.restController,
                this.rulesController,
                this.authController,
                this.updateRuleController,
                this.storageController,
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
            jwk: restWebService.authJwk(
                this.options
            ),
        };
    }
}
