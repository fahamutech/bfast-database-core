import {BFastOptions} from './bfast-database.option';
import {WebServices} from './webservices/index.webservice';
import {AuthFactory} from "./factory/auth.factory";
import {AuthAdapter} from "./adapters/auth.adapter";
import {FilesAdapter} from "./adapters/files.adapter";
import {S3StorageFactory} from "./factory/s3-storage.factory";
import {IpfsStorageFactory} from "./factory/ipfs-storage.factory";
import {
    GetDataFn,
    GetNodeFn,
    GetNodesFn,
    InitDatabaseFn,
    PurgeNodeValueFn,
    UpsertDataFn,
    UpsertNodeFn
} from "./adapters/database.adapter";

function getAuthFactory(options: BFastOptions): AuthAdapter {
    return (options && options.adapters && options.adapters.auth)
        ? options.adapters.auth(options)
        : new AuthFactory()
}

function getFilesFactory(options: BFastOptions): FilesAdapter {
    return (options && options.adapters && options.adapters.s3Storage && typeof options.adapters.s3Storage === "object")
        ? new S3StorageFactory()
        : new IpfsStorageFactory()
}

function validateOptions(
    options: BFastOptions
): { valid: boolean, message: string } {
    if (!options.rsaPublicKeyInJson) {
        return {
            valid: false,
            message: 'rsa public key in json format required, for jwk'
        };
    } else if (!options.rsaKeyPairInJson) {
        return {
            valid: false,
            message: 'rsa key pair in json format required, for jwk'
        };
    } else if (!options.port) {
        return {
            valid: false,
            message: 'Port option required'
        };
    } else if (!options.masterKey) {
        return {
            valid: false,
            message: 'MasterKey required'
        };
    } else {
        if (!options.mongoDbUri) {
            return {
                valid: false,
                message: 'mongoDbUri required, or supply database adapters instead'
            };
        }
        return {
            valid: true,
            message: 'no issues'
        };
    }
}

async function setUpDatabase(init: InitDatabaseFn, options: BFastOptions): Promise<any> {
    return await init(options);
}

export function initialize(
    initDb: InitDatabaseFn,
    getNodes: GetNodesFn<any>,
    getNode: GetNodeFn,
    getDataInStore: GetDataFn,
    upsertNode: UpsertNodeFn<any>,
    upsertDataInStore: UpsertDataFn<any>,
    purgeNodeValue: PurgeNodeValueFn,
    options: BFastOptions
): WebServices {
    options = Object.assign(options, {
        rsaKeyPairInJson: {},
        rsaPublicKeyInJson: {}
    });
    if (validateOptions(options).valid) {
        if (options && options.rsaKeyPairInJson && typeof options.rsaKeyPairInJson === "object") {
            options.rsaKeyPairInJson.alg = 'RS256';
            options.rsaKeyPairInJson.use = 'sig';
        }
        if (options && options.rsaPublicKeyInJson && typeof options.rsaPublicKeyInJson === "object") {
            options.rsaPublicKeyInJson.alg = 'RS256';
            options.rsaPublicKeyInJson.use = 'sig';
        }
        if (!options.adapters) {
            options.adapters = {};
        }
        setUpDatabase(initDb, options).catch(_ => {
            console.error(_);
            process.exit(-1);
        });
        return new WebServices(
            getAuthFactory(options),
            getFilesFactory(options),
            getNodes,
            getNode,
            getDataInStore,
            upsertNode,
            upsertDataInStore,
            purgeNodeValue,
            options
        );
    } else {
        throw new Error(validateOptions(options).message);
    }
}

