import {DatabaseAdapter} from './adapters/database.adapter';
import {AuthAdapter} from './adapters/auth.adapter';
import {EmailAdapter} from './adapters/email.adapter';

export interface BFastDatabaseConfigAdapter {
  port?: string;
  masterKey?: string;
  applicationId?: string;
  // mountPath: string;
  mongoDbUri?: string;
  adapters?: {
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
  };
}
