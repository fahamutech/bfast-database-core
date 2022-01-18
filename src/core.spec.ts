import {initialize} from "./core";
import {expect, should} from "chai";

describe('Core', function () {
    describe('initialize', function () {
        it('should return initialized web services', function () {
            const webServices = initialize({
                applicationId: 'test', projectId: 'test', port: '5789', databaseURI: 'test', masterKey: 'test'
            });
            should().exist(webServices);
            expect(webServices.rest).be.a("function");
            expect(webServices.storage).be.a("function");
            expect(webServices.realtime).be.a("function");
        });
    });
});
