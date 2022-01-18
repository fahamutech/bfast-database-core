import {BFastOptions, isBFastOptions} from './bfast-option';
import {WebServices} from './webservices';
import {AuthFactory} from "./factories/auth";
import {AuthAdapter} from "./adapters/auth";
import {FilesAdapter} from "./adapters/files";
import {S3StorageFactory} from "./factories/s3-storage";
import {IpfsStorageFactory} from "./factories/ipfs-storage";
import {initDataStore} from "./controllers/database";
import {DatabaseAdapter} from "./adapters/database";
import {MongoDatabaseFactory} from "./factories/mongo-database";

function getAuthFactory(options: BFastOptions): AuthAdapter {
    return (options && options.adapters && options.adapters.auth)
        ? options.adapters.auth(options)
        : new AuthFactory()
}

function getDatabaseFactory(options: BFastOptions): DatabaseAdapter {
    return (options && options.adapters && options.adapters.database)
        ? options.adapters.database(options)
        : new MongoDatabaseFactory()
}

function getFilesFactory(options: BFastOptions): FilesAdapter {
    if (!options.adapters) options.adapters = {};
    return (options &&
        options.adapters &&
        options.adapters.s3Storage &&
        typeof options.adapters.s3Storage === "object")
        ? new S3StorageFactory()
        : new IpfsStorageFactory()
}

async function setUpDatabase(options: BFastOptions): Promise<any> {
    const databaseFactory = getDatabaseFactory(options)
    return initDataStore(databaseFactory, options)
}

export function initialize(options: BFastOptions): WebServices {
    let reason;
    if (isBFastOptions(options, r => reason = r)) {
        setUpDatabase(options).catch(_ => {
            console.error(_);
            process.exit(-1);
        });
        const fileF = getFilesFactory(options);
        fileF.init(options).catch(console.log);
        const authFactory = getAuthFactory(options)
        const databaseFactory = getDatabaseFactory(options)
        return new WebServices(authFactory, fileF, databaseFactory, options);
    } else throw {message: reason}
}

