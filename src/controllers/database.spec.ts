import {loadEnv} from "../utils/env";
import {
    aggregateDataInStore,
    initDataStore,
    removeDataInStore,
    updateDataInStore,
    updateManyData,
    writeManyDataInStore,
    writeOneDataInStore
} from "./database";
import {expect, should} from "chai";
import {RuleContext} from "../models/rule-context";
import {DatabaseAdapter} from "../adapters/database";
import {Data} from "../models/data";
import {BFastOptions} from "../bfast-option";
import {AppEventsFactory} from "../factories/app-events";
import {handleDeleteRules} from "./rules";
import {extractResultFromServer} from "bfast";
import {databaseFactory} from "../test";
import {UpdateModel} from "../models/update-model";
import {DatabaseWriteOptions} from "../models/database-write-options";

const context: RuleContext = {}
const domain = 'test';
let options;
const appEvent = AppEventsFactory.getInstance()

async function clearData() {
    const a = await handleDeleteRules({
        deletetest: {
            filter: {
                updatedAt: {$exists: true}
            }
        }
    }, {errors: {}}, databaseFactory(), loadEnv(), null)
    extractResultFromServer(a, 'delete', 'test')
}

describe('DatabaseController', function () {
    beforeEach(() => options = loadEnv())
    before(async () => await clearData())
    after(async () => await clearData())
    describe('initDataStore', function () {
        it('should call the init method of database factory', function (done) {
            const databaseFactory = {init: () => done()}
            // @ts-ignore
            initDataStore(databaseFactory, options)
        });
        it('should throw error if options are not valid', function (done) {
            // @ts-ignore
            initDataStore(null, {applicationId: 'abc'}).catch(reason => {
                expect(reason.message).eql('invalid bfast options');
                should().exist(reason.reason);
                expect(reason.reason).be.a('string')
                done()
            })
        });
        it('should throw error if database Factory is not valid', function (done) {
            initDataStore(null, options).catch(reason => {
                should().exist(reason);
                done()
            })
        });
    });
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
