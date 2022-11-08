import {readFileSync, statSync} from 'fs';
import {BFastOptions} from "../bfast-option";
import {debuglog} from "util";

enum EnvNames {
    APPLICATION_ID = 'APPLICATION_ID',
    PROJECT_ID = 'PROJECT_ID',
    MASTER_KEY = 'MASTER_KEY',
    PRODUCTION = 'PRODUCTION',
    S3_BUCKET = 'S3_BUCKET',
    S3_ACCESS_KEY = 'S3_ACCESS_KEY',
    S3_ENDPOINT = 'S3_ENDPOINT',
    NPM_TAR = 'NPM_TAR',
    GIT_CLONE_URL = 'GIT_CLONE_URL',
    MOUNT_PATH = 'MOUNT_PATH',
    S3_SECRET_KEY = 'S3_SECRET_KEY',
    RSA_PUBLIC_KEY = 'RSA_PUBLIC_KEY',
    RSA_KEY = 'RSA_KEY',
    DATABASE_URI = 'DATABASE_URI',
    LOGS = 'LOGS',
    TAARIFA_TOKEN = 'TAARIFA_TOKEN',
    WEB_3_TOKEN = 'WEB_3_TOKEN',
    IPFS_HOSTNAME = 'IPFS_HOSTNAME',
    S3_REGION = 'S3_REGION',
    PORT = 'PORT',
}

function tryStringToObject(value: string): any {
    value = value.trim();
    if (value.startsWith('{') && value.endsWith('}')) {
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    }
    return value;
}
const log = debuglog('dev');
const logP = debuglog('prod');

export function getEnv(name: string): any {
    if (name && name.toString() !== 'undefined' && name.toString() !== 'null') {
        let isFile;
        try {
            const fileStats = statSync(name);
            isFile = fileStats.isFile();
        } catch (_) {
            isFile = false;
        }
        if (name?.startsWith('/') === true && isFile === true) {
            try {
                let value = readFileSync(name, {encoding: 'utf8'});
                return tryStringToObject(value);
            } catch (_) {
                return tryStringToObject(name);
            }
        } else {
            return tryStringToObject(name);
        }
    } else {
        return undefined;
    }
}

export function loadEnv(): BFastOptions {
    let isS3Configured = true;
    const s3Bucket = getEnv(process.env[EnvNames.S3_BUCKET.toString()]);
    const s3AccessKey = getEnv(process.env[EnvNames.S3_ACCESS_KEY.toString()]);
    const s3SecretKey = getEnv(process.env[EnvNames.S3_SECRET_KEY.toString()]);
    const s3Endpoint = getEnv(process.env[EnvNames.S3_ENDPOINT.toString()]);
    const s3Region = getEnv(process.env[EnvNames.S3_REGION.toString()]);
    let checker = [];
    checker.push(s3Bucket, s3AccessKey, s3SecretKey, s3Endpoint, s3Region);
    checker = checker.filter(x => {
        if (!x) {
            return false;
        } else if (x.toString() === 'null') {
            return false;
        } else if (x.toString() === 'undefined') {
            return false;
        } else return x.toString() !== '';
    })
    if (checker.length === 0) {
        isS3Configured = false;
    } else {
        checker.forEach(value => {
            if (!value) {
                isS3Configured = false;
            } else if (value.toString() === 'null') {
                isS3Configured = false;
            } else if (value.toString() === 'undefined') {
                isS3Configured = false;
            } else if (value.toString() === '') {
                isS3Configured = false;
            }
        })
    }
    // @ts-ignore
    const options: BFastOptions = {};
    options.ipfsResolveHost = getEnv(process.env[EnvNames.IPFS_HOSTNAME])
        ? getEnv(process.env[EnvNames.IPFS_HOSTNAME])
        : 'w3s.link';
    options.applicationId = getEnv(process.env[EnvNames.APPLICATION_ID]);
    options.projectId = getEnv(process.env[EnvNames.PROJECT_ID]);
    options.port = getEnv(process.env[EnvNames.PORT]);
    options.masterKey = getEnv(process.env[EnvNames.MASTER_KEY]);
    options.web3Token = getEnv(process.env[EnvNames.WEB_3_TOKEN]);
    options.logs = getEnv(process.env[EnvNames.LOGS]) === '1';
    options.databaseURI = getEnv(process.env[EnvNames.DATABASE_URI]);
    options.taarifaToken = getEnv(process.env[EnvNames.TAARIFA_TOKEN]);
    options.rsaPublicKeyInJson = getEnv(process.env[EnvNames.RSA_PUBLIC_KEY]);
    options.rsaKeyPairInJson = getEnv(process.env[EnvNames.RSA_KEY]);
    options.adapters = {
        s3Storage: isS3Configured ? {
            bucket: s3Bucket,
            endPoint: s3Endpoint,
            secretKey: s3SecretKey,
            accessKey: s3AccessKey,
            region: s3Region
        } : undefined,
    }
    return options;
}

export function devLog(message, ...args){
    log(message, args);
}

export function prodLog(message: string, ...args){
    logP(message, args);
}

export enum Const {
    DB_CHANGES_EVENT = '_db_changes_',
}
