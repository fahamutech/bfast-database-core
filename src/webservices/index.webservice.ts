import {RestWebservice} from './rest.webservice';
import {ChangesWebservice} from './changes.webservice';
import {StorageWebservice} from './storage.webservice';
import {FunctionsModel} from '../model/functions.model';
import {StorageApiModel} from '../model/storage-api.model';
import {RestController} from "../controllers/rest.controller";
import {SecurityController} from "../controllers/security.controller";
import {DatabaseController} from "../controllers/database.controller";
import {AuthController} from "../controllers/auth.controller";
import {StorageController} from "../controllers/storage.controller";
import {DatabaseAdapter} from "../adapters/database.adapter";
import {FilesAdapter} from "../adapters/files.adapter";
import {BFastDatabaseOptions} from "../bfast-database.option";
import {RulesController} from "../controllers/rules.controller";
import {UpdateRuleController} from "../controllers/update.rule.controller";
import {AuthAdapter} from "../adapters/auth.adapter";

export class WebServices {
    constructor(private readonly restController: RestController,
                private readonly rulesController: RulesController,
                private readonly updateRuleController: UpdateRuleController,
                private readonly securityController: SecurityController,
                private readonly databaseController: DatabaseController,
                private readonly authController: AuthController,
                private readonly storageController: StorageController,
                private readonly authAdapter: AuthAdapter,
                private readonly databaseAdapter: DatabaseAdapter,
                private readonly filesAdapter: FilesAdapter,
                private readonly options: BFastDatabaseOptions) {
    }

    storage(prefix = '/'): StorageApiModel {
        const storageWebservice = new StorageWebservice();
        return {
            fileV1Api: storageWebservice.getFileStorageV1(
                prefix,
                this.restController,
                this.securityController,
                this.databaseController,
                this.authController,
                this.storageController,
                this.databaseAdapter,
                this.filesAdapter,
                this.options
            ),
            fileApi: storageWebservice.getFileFromStorage(
                prefix,
                this.restController,
                this.securityController,
                this.databaseController,
                this.authController,
                this.storageController,
                this.databaseAdapter,
                this.filesAdapter,
                this.options
            ),
            fileV2Api: storageWebservice.getFileFromStorageV2(
                prefix,
                this.restController,
                this.securityController,
                this.databaseController,
                this.authController,
                this.storageController,
                this.databaseAdapter,
                this.filesAdapter,
                this.options
            ),
            fileThumbnailApi: storageWebservice.geThumbnailFromStorage(
                prefix,
                this.restController,
                this.securityController,
                this.databaseController,
                this.authController,
                this.storageController,
                this.databaseAdapter,
                this.filesAdapter,
                this.options
            ),
            fileThumbnailV2Api: storageWebservice.geThumbnailFromStorageV2(
                prefix,
                this.restController,
                this.securityController,
                this.databaseController,
                this.authController,
                this.storageController,
                this.databaseAdapter,
                this.filesAdapter,
                this.options
            ),
            fileListApi: storageWebservice.getFilesFromStorage(
                prefix,
                this.restController,
                this.securityController,
                this.databaseController,
                this.authController,
                this.storageController,
                this.databaseAdapter,
                this.filesAdapter,
                this.options
            ),
            fileListV2Api: storageWebservice.getFilesFromStorageV2(
                prefix,
                this.restController,
                this.securityController,
                this.databaseController,
                this.authController,
                this.storageController,
                this.databaseAdapter,
                this.filesAdapter,
                this.options
            ),
            fileUploadApi: storageWebservice.uploadMultiPartFile(
                prefix,
                this.restController,
                this.securityController,
                this.databaseController,
                this.authController,
                this.storageController,
                this.databaseAdapter,
                this.filesAdapter,
                this.options
            ),
            fileUploadV2Api: storageWebservice.uploadMultiPartFileV2(
                prefix,
                this.restController,
                this.securityController,
                this.databaseController,
                this.authController,
                this.storageController,
                this.databaseAdapter,
                this.filesAdapter,
                this.options
            ),
            getUploadFileV2: storageWebservice.getUploadFileV2(prefix),
        };
    }

    realtime(config: { applicationId: string, masterKey: string }, prefix = '/'): { changes: { name: string, onEvent: any } } {
        const changesWebService = new ChangesWebservice();
        return {
            changes: changesWebService.changesV2(
                config,
                prefix,
                this.databaseController,
                this.securityController,
                this.databaseAdapter
            )
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
                this.databaseController,
                this.storageController,
                this.authAdapter,
                this.filesAdapter,
                this.databaseAdapter,
                this.options
            ),
            jwk: restWebService.authJwk(
                this.options
            ),
        };
    }
}
