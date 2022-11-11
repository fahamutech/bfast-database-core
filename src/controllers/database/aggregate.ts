import {DatabaseAdapter} from "../../adapters/database";
import {DatabaseWriteOptions} from "../../models/database-write-options";
import {BFastOptions} from "../../bfast-option";
import {checkIsAllowedDomainName, sanitize4User} from "./index";

export async function aggregateDataInStore(
    table: string, pipelines: any[], databaseAdapter: DatabaseAdapter,
    writeOptions: DatabaseWriteOptions = {bypassDomainVerification: false}, options: BFastOptions
): Promise<any> {
    await checkIsAllowedDomainName(table, writeOptions);
    const results = await databaseAdapter.aggregateData(table, pipelines, options);
    return results.map(result => sanitize4User(result, []));
}
