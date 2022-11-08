import {expect} from "chai";
import {DatabaseAdapter} from "../../adapters/database";
import {BFastOptions} from "../../bfast-option";
import {appEvent, context, domain, options} from "./index.spec";
import {removeDataInStore} from "./remove";

describe('DatabaseRemoveController', function () {
    describe('removeDataInStore', function () {
        it('should remove data and publish changes', async function () {
            const eventName = appEvent.eventName(options.projectId, domain)
            let published = false
            const listen = doc => {
                expect(doc._id).be.a('string');
                expect(doc.documentKey).be.a('string');
                expect(doc.fullDocument).be.a('object');
                expect(doc.operationType).equal('delete');
                published = true
            }
            appEvent.sub(eventName, listen)
            const data: any = {'id': 'xps'}
            // @ts-ignore
            const databaseFactory: DatabaseAdapter = {
                removeOneData: async (_1: string, id: string, _3: BFastOptions) => {
                    return {_id: id}
                }
            }
            const wOptions = {bypassDomainVerification: false}
            const a = await removeDataInStore(domain, data, context, databaseFactory, wOptions, options)
            await new Promise(r => setTimeout(r, 20))
            expect(a).be.a('array')
            expect(a[0].id).be.a('string')
            expect(published).eql(true)
            appEvent.unSub(eventName, listen)
        });
    });
});
