import {AuthAdapter} from './adapters/auth.adapter';
import {EmailAdapter} from './adapters/email.adapter';

export interface BFastOptions {
    useLocalIpfs?: boolean;
    port: string;
    masterKey: string;
    applicationId: string;
    projectId: string;
    logs?: boolean;
    mongoDbUri: string;
    taarifaToken?: string;
    rsaKeyPairInJson: any;
    rsaPublicKeyInJson: any;
    web3Token?: string;
    adapters?: {
        auth?: (config: BFastOptions) => AuthAdapter;
        email?: (config: BFastOptions) => EmailAdapter;
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
