import {expect, should} from "chai";
import {DatabaseAdapter} from "../../adapters/database";
import {Data} from "../../models/data";
import {BFastOptions} from "../../bfast-option";
import {writeManyDataInStore, writeOneDataInStore} from "./write";
import {appEvent, domain, options, context} from "./index.spec";

describe('DatabaseWriteController', function () {
    describe('writeOneDataInStore', function () {
        it('should write data if valid and publish changes', async function () {
            const eventName = appEvent.eventName(options.projectId, domain)
            let published = false
            const listen = doc => {
                expect(doc._id).be.a('string');
                expect(doc.documentKey).be.a('string');
                expect(doc.fullDocument).be.a('object');
                expect(doc.fullDocument.name).equal('xps');
                expect(doc.operationType).equal('create');
                published = true
            }
            appEvent.sub(eventName, listen)
            const data: any = {name: 'xps', 'id': 'xps'}
            // @ts-ignore
            const databaseFactory: DatabaseAdapter = {
                createOneData: async (_1: string, data: Data, _3: BFastOptions) => {
                    return data
                }
            }
            const wOptions = {bypassDomainVerification: false}
            const a = await writeOneDataInStore(domain, data, context, databaseFactory, wOptions, options)
            await new Promise(r => setTimeout(r, 20))
            expect(a.name).eql('xps')
            expect(a.id).be.a('string')
            should().exist(a.createdAt)
            should().exist(a.updatedAt)
            expect(published).eql(true)
            appEvent.unSub(eventName, listen)
        });
        it('should not write null data', function () {
            const data: any = null
            const databaseFactory: any = {}
            const wOptions = {bypassDomainVerification: false}
            writeOneDataInStore(domain, data, context, databaseFactory, wOptions, options).catch(reason => {
                should().exist(reason);
                expect(reason.message).eql('invalid data')
                should().exist(reason.reason)
            })
        });
        it('should not write if domain is null', function () {
            const data: any = {name: 'xps'}
            const databaseFactory: any = {}
            const wOptions = {bypassDomainVerification: false}
            writeOneDataInStore(null, data, context, databaseFactory, wOptions, options).catch(reason => {
                should().exist(reason);
                expect(reason.message).eql('invalid domain')
                should().exist(reason.reason)
            })
        });
    });
    describe('writeManyDataInStore', function () {
        it('should write many data and publish changes', async function () {
            const eventName = appEvent.eventName(options.projectId, domain)
            let published = false
            const listen = doc => {
                expect(doc._id).be.a('string');
                expect(doc.documentKey).be.a('string');
                expect(doc.fullDocument).be.a('object');
                expect(doc.fullDocument.name).be.a('string');
                expect(doc.operationType).equal('create');
                published = true
            }
            appEvent.sub(eventName, listen)
            const data: any = [{name: 'hp'}, {name: 'dell'}]
            // @ts-ignore
            const databaseFactory: DatabaseAdapter = {
                createManyData: async (_1: string, data: Data[], _3: BFastOptions) => data
            }
            const wOptions = {bypassDomainVerification: false}
            const a = await writeManyDataInStore(domain, data, context, databaseFactory, wOptions, options)
            await new Promise(r => setTimeout(r, 20))
            expect(a).be.a('array')
            expect(a).length(2)
            expect(published).eql(true)
            appEvent.unSub(eventName, listen)
        });
        it('should not write null data', function () {
            const data: any = null
            const databaseFactory: any = {}
            const wOptions = {bypassDomainVerification: false}
            writeManyDataInStore(domain, data, context, databaseFactory, wOptions, options).catch(reason => {
                should().exist(reason);
                expect(reason.message).eql('invalid data')
                should().exist(reason.reason)
            })
        });
        it('should not write if domain is null', function () {
            const data: any = [{name: 'xps'}]
            const databaseFactory: any = {}
            const wOptions = {bypassDomainVerification: false}
            writeManyDataInStore(null, data, context, databaseFactory, wOptions, options).catch(reason => {
                should().exist(reason);
                expect(reason.message).eql('invalid domain')
                should().exist(reason.reason)
            })
        });
    });
});
