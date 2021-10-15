import {DatabaseBasicOptions} from "./database-basic-options";

export interface DatabaseWriteOptions extends DatabaseBasicOptions {
    indexes?: {
        field?: string,
        unique?: boolean,
        collation?: { locale: string, strength: number },
        expireAfterSeconds?: number;
    }[];
}
