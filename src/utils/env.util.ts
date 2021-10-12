// @ts-ignore
import {readFileSync, statSync} from 'fs';
import {BFastOptions} from "../bfast-database.option";

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
    MONGO_URL = 'MONGO_URL',
    LOGS = 'LOGS',
    TAARIFA_TOKEN = 'TAARIFA_TOKEN',
    WEB_3_TOKEN = 'WEB_3_TOKEN',
    USE_LOCAL_IPFS = 'USE_LOCAL_IPFS',
    S3_REGION = 'S3_REGION',
    PORT = 'PORT',
}

export class EnvUtil {
    getEnv(name: string): string {
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
                    return EnvUtil.tryStringToObject(value);
                } catch (_) {
                    return EnvUtil.tryStringToObject(name);
                }
            } else {
                return EnvUtil.tryStringToObject(name);
            }
        } else {
            return undefined;
        }
    }

    loadEnv(): BFastOptions {
        let isS3Configured = true;
        const s3Bucket = this.getEnv(process.env[EnvNames.S3_BUCKET.toString()]);
        const s3AccessKey = this.getEnv(process.env[EnvNames.S3_ACCESS_KEY.toString()]);
        const s3SecretKey = this.getEnv(process.env[EnvNames.S3_SECRET_KEY.toString()]);
        const s3Endpoint = this.getEnv(process.env[EnvNames.S3_ENDPOINT.toString()]);
        const s3Region = this.getEnv(process.env[EnvNames.S3_REGION.toString()]);
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
        options.useLocalIpfs = this.getEnv(process.env[EnvNames.USE_LOCAL_IPFS])?.toString()?.toLowerCase() === 'true';
        options.applicationId = this.getEnv(process.env[EnvNames.APPLICATION_ID]);
        options.projectId = this.getEnv(process.env[EnvNames.PROJECT_ID]);
        options.port = this.getEnv(process.env[EnvNames.PORT]);
        options.masterKey = this.getEnv(process.env[EnvNames.MASTER_KEY]);
        options.web3Token = this.getEnv(process.env[EnvNames.WEB_3_TOKEN]);
        options.logs = this.getEnv(process.env[EnvNames.LOGS]) === '1';
        options.mongoDbUri = this.getEnv(process.env[EnvNames.MONGO_URL]);
        options.taarifaToken = this.getEnv(process.env[EnvNames.TAARIFA_TOKEN]);
        options.rsaPublicKeyInJson = this.getEnv(process.env[EnvNames.RSA_PUBLIC_KEY]);
        options.rsaKeyPairInJson = this.getEnv(process.env[EnvNames.RSA_KEY]);
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


    private static tryStringToObject(value: string): any {
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
}
