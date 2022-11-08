import {DatabaseAdapter} from "../../adapters/database";

export async function transaction<S>(
    databaseAdapter: DatabaseAdapter, operations: (session: S) => Promise<any>
): Promise<any> {
    const session = await databaseAdapter.session<S>()
    return await operations(session);
}
