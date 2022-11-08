import {DatabaseAdapter} from "../../adapters/database";
import {BFastOptions} from "../../bfast-option";
import {DatabaseWriteOptions} from "../../models/database-write-options";
import {expect} from "chai";
import {domain, options} from "./index.spec";
import {aggregateDataInStore} from "./aggregate";

describe('DatabaseAggregateController', function () {
    describe('aggregateDataInStore', function () {
        it('should aggregate data', async function () {
            // @ts-ignore
            const databaseFactory: DatabaseAdapter = {
                aggregateData: async (_1: string, _2: any[], _3: BFastOptions) => {
                    return [{_id: '2000'}]
                }
            }
            const wOptions: DatabaseWriteOptions = {bypassDomainVerification: false}
            const a = await aggregateDataInStore(domain, [], databaseFactory, wOptions, options)
            expect(a).eql([{id: '2000'}])
        });
    });
});
