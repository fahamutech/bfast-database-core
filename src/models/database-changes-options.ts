import {DatabaseWriteOptions} from "./database-write-options";

export interface DatabaseChangesOptions extends DatabaseWriteOptions {
    resumeToken?: string;
}
