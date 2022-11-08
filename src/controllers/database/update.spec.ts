import {expect, should} from "chai";
import {DatabaseAdapter} from "../../adapters/database";
import {UpdateModel} from "../../models/update-model";
import {BFastOptions} from "../../bfast-option";
import {AppEventsFactory} from "../../factories/app-events";
import {appEvent, context, domain, options} from "./index.spec";
import {updateDataInStore, updateManyData} from "./update";

describe('DatabaseUpdateController', function () {
    describe('updateDataInStore', function () {
        it('should update data and publish changes', async function () {
            const eventName = appEvent.eventName(options.projectId, domain)
            let published = false
            const listen = doc => {
                expect(doc._id).be.a('string');
                expect(doc.documentKey).be.a('string');
                expect(doc.fullDocument).be.a('object');
                expect(doc.fullDocument.name).equal('xps');
                expect(doc.operationType).equal('update');
                published = true
            }
            appEvent.sub(eventName, listen)
            const data: any = {id: 'xps', update: {$set: {age: 20}}}
            // @ts-ignore
            const databaseFactory: DatabaseAdapter = {
                updateOneData: async (_1: string, _2: UpdateModel, _3: BFastOptions) => {
                    return {modified: 1}
                },
                getOneData: async (_1: string, id: string, _3: BFastOptions) => {
                    return {name: 'xps', '_id': id}
                }
            }
            const wOptions = {bypassDomainVerification: false}
            const a = await updateDataInStore(domain, data, context, databaseFactory, wOptions, options)
            await new Promise(r => setTimeout(r, 30))
            appEvent.unSub(eventName, listen)
            expect(a.modified).eql(1)
            expect(a.message).be.a('string')
            expect(published).eql(true)

        });
        it('should update data and publish changes by using filter', async function () {
            const appEvent = AppEventsFactory.getInstance()
            const eventName = appEvent.eventName(options.projectId, domain)
            let published = false
            const listen = doc => {
                expect(doc._id).be.a('string');
                expect(doc.documentKey).be.a('string');
                expect(doc.fullDocument).be.a('object');
                expect(doc.fullDocument.name).equal('xps');
                expect(doc.operationType).equal('update');
                published = true
            }
            appEvent.sub(eventName, listen)
            const data: any = {filter: {name: 'xps'}, update: {$set: {age: 10}}}
            // @ts-ignore
            const databaseFactory: DatabaseAdapter = {
                updateOneData: async (_1: string, _2: UpdateModel, _3: BFastOptions) => {
                    return {modified: 1}
                },
                getManyData: async (_1: string, _2: any, _3: BFastOptions) => {
                    return [{name: 'xps', '_id': 'xps'}]
                }
            }
            const wOptions = {bypassDomainVerification: false}
            const a = await updateDataInStore(domain, data, context, databaseFactory, wOptions, options)
            await new Promise(r => setTimeout(r, 30))
            appEvent.unSub(eventName, listen)
            expect(a.modified).eql(1)
            expect(a.message).be.a('string')
            expect(published).eql(true)

        });
        it('should not update null data', function () {
            const data: any = null
            const databaseFactory: any = {}
            const wOptions = {bypassDomainVerification: false}
            updateDataInStore(domain, data, context, databaseFactory, wOptions, options).catch(reason => {
                should().exist(reason);
                expect(reason.message).eql('invalid data')
                should().exist(reason.reason)
            })
        });
        it('should not update if domain is null', function () {
            const data: any = {id: 'abc'}
            const databaseFactory: any = {}
            const wOptions = {bypassDomainVerification: false}
            updateDataInStore(null, data, context, databaseFactory, wOptions, options).catch(reason => {
                should().exist(reason);
                expect(reason.message).eql('invalid domain')
                should().exist(reason.reason)
            })
        });
    });
    describe('updateManyData', function () {
        it('should update data and publish changes by using filter and multiple updates', async function () {
            const eventName = appEvent.eventName(options.projectId, domain)
            let published = false
            const listen = doc => {
                expect(doc._id).be.a('string');
                expect(doc.documentKey).be.a('string');
                expect(doc.fullDocument).be.a('object');
                expect(doc.fullDocument.name).equal('xps');
                expect(doc.operationType).equal('update');
                published = true
            }
            appEvent.sub(eventName, listen)
            const data: any = [{filter: {name: 'xps'}, update: {$set: {age: 10}}}]
            // @ts-ignore
            const databaseFactory: DatabaseAdapter = {
                updateManyData: async (_1: string, _2: UpdateModel[], _3: BFastOptions) => {
                    return {modified: 1}
                },
                getManyData: async (_1: string, _2: any, _3: BFastOptions) => {
                    return [{name: 'xps', '_id': 'xps'}]
                }
            }
            const wOptions = {bypassDomainVerification: false}
            const a = await updateManyData(domain, data, context, databaseFactory, wOptions, options)
            await new Promise(r => setTimeout(r, 30))
            appEvent.unSub(eventName, listen)
            expect(a.modified).eql(1)
            expect(a.message).be.a('string')
            expect(published).eql(true)

        });
    });
});
