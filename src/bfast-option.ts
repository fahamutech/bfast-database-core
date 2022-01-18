import {AuthAdapter} from './adapters/auth';
import {validate} from "jsonschema";
import {DatabaseAdapter} from "./adapters/database";

export type BFastOptions = {
    useLocalIpfs?: boolean;
    port: string;
    masterKey: string;
    applicationId: string;
    projectId: string;
    logs?: boolean;
    databaseURI: string;
    taarifaToken?: string;
    rsaKeyPairInJson?: any;
    rsaPublicKeyInJson?: any;
    web3Token?: string;
    adapters?: {
        auth?: (config: BFastOptions) => AuthAdapter;
        database?: (config: BFastOptions) => DatabaseAdapter;
        // email?: (config: BFastOptions) => EmailAdapter;
        s3Storage?: {
            accessKey: string;
            bucket: string;
            direct?: boolean;
            endPoint: string;
            prefix?: string;
            region?: string;
            useSSL?: boolean;
            port?: null;
            secretKey: string;
        } | undefined;
    };
}

export type BFastOptionsFn = (request: any) => BFastOptions

export function isBFastOptions(options: BFastOptions, onReason?: (reason: string) => void): options is BFastOptions {
    // @ts-ignore
    const v = validate(options, BFastOptionsSchema, {required: true});
    if (onReason) onReason(v.errors.map(x => x.property + ' ' + x.message).join(','));
    return v.valid;
}

export const BFastOptionsSchema = {
    type: "object",
    properties: {
        useLocalIpfs: {type: "boolean"},
        port: {type: "string", minLength: 1},
        masterKey: {type: "string", minLength: 1},
        applicationId: {type: "string", minLength: 1},
        projectId: {type: "string", minLength: 1},
        logs: {type: "boolean"},
        databaseURI: {type: "string", minLength: 1},
        taarifaToken: {type: "string", minLength: 1},
        web3Token: {type: "string", minLength: 1},
        adapters: {
            type: "object",
            properties: {
                auth: {},
                email: {},
                s3Storage: {
                    type: "object",
                    properties: {
                        accessKey: {type: "string", minLength: 1},
                        bucket: {type: "string", minLength: 1},
                        direct: {type: "boolean"},
                        endPoint: {type: "string", minLength: 1},
                        prefix: {type: "string", minLength: 1},
                        region: {type: "string", minLength: 1},
                        useSSL: {type: "boolean"},
                        secretKey: {type: "string", minLength: 1},
                    },
                    required: ['accessKey', 'bucket', 'endPoint', 'secretKey']
                }
            }
        }
    },
    required: ['port', 'masterKey', 'applicationId', 'projectId', 'databaseURI']
}