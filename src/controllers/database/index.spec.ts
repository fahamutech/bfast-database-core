import {loadEnv} from "../../utils";
import {initDataStore} from "./index";
import {expect, should} from "chai";
import {RuleContext} from "../../models/rule-context";
import {AppEventsFactory} from "../../factories/app-events";
import {handleDeleteRules} from "../rules/rules";
import {extractResultFromServer} from "bfast";
import {databaseFactory} from "../../test";

export const context: RuleContext = {}
export const domain = 'test';
export let options = loadEnv();
export const appEvent = AppEventsFactory.getInstance()

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
});
