import {DatabaseBasicOptions} from "./database-basic-options";

export interface DatabaseUpdateOptions extends DatabaseBasicOptions {
    indexes?: {
        field?: string;
        unique?: boolean;
        collation?: { locale: string, strength: number };
        expireAfterSeconds?: number;
    }[];
    dbOptions?: { [key: string]: any }
}
