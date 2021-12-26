import {BFastOptions, isBFastOptions} from './bfast-option';
import {WebServices} from './webservices/index.webservice';
import {AuthFactory} from "./factories/auth.factory";
import {AuthAdapter} from "./adapters/auth.adapter";
import {FilesAdapter} from "./adapters/files.adapter";
import {S3StorageFactory} from "./factories/s3-storage.factory";
import {IpfsStorageFactory} from "./factories/ipfs-storage.factory";
import {init} from "./controllers/database.controller";

function getAuthFactory(options: BFastOptions): AuthAdapter {
    return (options && options.adapters && options.adapters.auth)
        ? options.adapters.auth(options)
        : new AuthFactory()
}

function getFilesFactory(options: BFastOptions): FilesAdapter {
    if (!options.adapters) {
        options.adapters = {};
    }
    return (options &&
        options.adapters &&
        options.adapters.s3Storage &&
        typeof options.adapters.s3Storage === "object")
        ? new S3StorageFactory()
        : new IpfsStorageFactory()
}

async function setUpDatabase(options: BFastOptions): Promise<any> {
    return init(options)
}

export function initialize(options: BFastOptions): WebServices {
    let reason;
    if (isBFastOptions(options, r => reason = r)) {
        options = Object.assign(options, {
            rsaKeyPairInJson: {},
            rsaPublicKeyInJson: {}
        });
        setUpDatabase(options).catch(_ => {
            console.error(_);
            process.exit(-1);
        });
        const fileF = getFilesFactory(options);
        fileF.init(options).catch(console.log);
        return new WebServices(getAuthFactory(options), fileF, options);
    } else {
        throw {message: reason}
    }
}

