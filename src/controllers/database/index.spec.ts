import {loadEnv} from "../../utils";
import {expect, should} from "chai";
import {RuleContext} from "../../models/rule-context";
import {AppEventsFactory} from "../../factories/app-events";
import {handleDeleteRules} from "../rules/rules";
import {extractResultFromServer} from "bfast";
import {databaseFactory} from "../../test";
import {checkIsAllowedDomainName} from "./index";

export const context: RuleContext = {}
export const domain = 'test';
export let options = loadEnv();
export const appEvent = AppEventsFactory.getInstance()

describe('DatabaseController', function () {
    beforeEach(() => options = loadEnv())

    // describe('checkIsAllowedDomainName', function () {
    //     it('should return true', function () {
    //         expect(checkIsAllowedDomainName('test',null)).eql(true);
    //     });
    //     it('should fail if is private domain', function () {
    //         for (const a of ['_User', '_Token', '_Policy']) {
    //             try {
    //                 should().not.exist(handleDomainValidation(a));
    //             } catch (e) {
    //                 expect(e).eql({message: `${a} is not a valid domain name`});
    //             }
    //         }
    //     });
    // });

    // describe('initDataStore', function () {
    //     it('should call the init method of database factory', function (done) {
    //         const databaseFactory = {init: () => done()}
    //         // @ts-ignore
    //         initDataStore(databaseFactory, options)
    //     });
    //     it('should throw error if options are not valid', function (done) {
    //         // @ts-ignore
    //         initDataStore(null, {applicationId: 'abc'}).catch(reason => {
    //             expect(reason.message).eql('invalid bfast options');
    //             should().exist(reason.reason);
    //             expect(reason.reason).be.a('string')
    //             done()
    //         })
    //     });
    //     it('should throw error if database Factory is not valid', function (done) {
    //         initDataStore(null, options).catch(reason => {
    //             should().exist(reason);
    //             done()
    //         })
    //     });
    // });
});
