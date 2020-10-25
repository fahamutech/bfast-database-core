import {DatabaseAdapter} from "./adapter/DatabaseAdapter";
import {AuthAdapter} from "./adapter/AuthAdapter";
import {EmailAdapter} from "./adapter/EmailAdapter";

// @dynamic
export class BfastConfig implements BFastDatabaseConfigAdapter {
    private static instance: BfastConfig;

    private constructor() {
    }

    static getInstance(): BfastConfig {
        if (this.instance) {
            return this.instance;
        } else {
            this.instance = new BfastConfig();
            return this.instance;
        }
    }

    addValues(config: BFastDatabaseConfigAdapter) {
        Object.assign(this, config);
    }

    applicationId: string;
    masterKey: string;
    // mountPath: string;
    mongoDbUri?: string;
    port: string;
    adapters: {
        database?: (config: BFastDatabaseConfigAdapter) => DatabaseAdapter;
        auth?: (config: BFastDatabaseConfigAdapter) => AuthAdapter;
        email?: (config: BFastDatabaseConfigAdapter) => EmailAdapter;
        s3Storage?: {
            accessKey: string;
            bucket: string;
            direct: boolean;
            endPoint: string;
            port?: null;
            prefix?: string;
            region?: string;
            useSSL?: boolean;
            secretKey: string;
        } | undefined;
    }
}


export interface BFastDatabaseConfigAdapter {
    port: string;
    masterKey?: string;
    applicationId: string;
    // mountPath: string;
    mongoDbUri?: string;
    adapters: {
        database?: (config: BFastDatabaseConfigAdapter) => DatabaseAdapter;
        auth?: (config: BFastDatabaseConfigAdapter) => AuthAdapter;
        email?: (config: BFastDatabaseConfigAdapter) => EmailAdapter;
        s3Storage?: {
            accessKey: string;
            bucket: string;
            direct: boolean;
            endPoint: string;
            prefix?: string;
            region?: string;
            useSSL?: boolean;
            port?: null;
            secretKey: string;
        } | undefined;
    }
}
