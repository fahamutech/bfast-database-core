import {expect} from "chai";
import {BFastOptionsSchema, isBFastOptions} from "./bfast-option";

describe('BFastOption', function () {
    describe('Schema', function () {
        it('should be truly', function () {
            expect(BFastOptionsSchema).eql({
                type: "object",
                properties: {
                    useLocalIpfs: {type: "boolean"},
                    port: {type: "string", minLength: 1},
                    masterKey: {type: "string", minLength: 1},
                    applicationId: {type: "string", minLength: 1},
                    projectId: {type: "string", minLength: 1},
                    logs: {type: "boolean"},
                    databaseURI: {type: "string", minLength: 1},
                    taarifaToken: {type: "string", minLength: 1},
                    web3Token: {type: "string", minLength: 1},
                    adapters: {
                        type: "object",
                        properties: {
                            auth: {},
                            email: {},
                            s3Storage: {
                                type: "object",
                                properties: {
                                    accessKey: {type: "string", minLength: 1},
                                    bucket: {type: "string", minLength: 1},
                                    direct: {type: "boolean"},
                                    endPoint: {type: "string", minLength: 1},
                                    prefix: {type: "string", minLength: 1},
                                    region: {type: "string", minLength: 1},
                                    useSSL: {type: "boolean"},
                                    secretKey: {type: "string", minLength: 1},
                                },
                                required: ['accessKey','bucket','endPoint','secretKey']
                            }
                        }
                    }
                },
                required: ['port','masterKey','applicationId','projectId','databaseURI']
            });
        });
    });
    describe('isBFastOption', function () {
        it('should fail if undefined', function () {
            let r;
            const  j = isBFastOptions(undefined, r1=>r=r1)
            expect(j).be.a("boolean");
            expect(j).equal(false);
            expect(r).be.a("string");
        });
        it('should fail if null', function () {
            let r;
            const  j = isBFastOptions(null, r1=>r=r1)
            expect(j).be.a("boolean");
            expect(j).equal(false);
            expect(r).be.a("string");
        });
        it('should fail if empty', function () {
            let r;
            // @ts-ignore
            const  j = isBFastOptions({}, r1=>r=r1)
            expect(j).be.a("boolean");
            expect(j).equal(false);
            expect(r).be.a("string");
        });
        it('should fail if number', function () {
            let r;
            // @ts-ignore
            const  j = isBFastOptions(1, r1=>r=r1)
            expect(j).be.a("boolean");
            expect(j).equal(false);
            expect(r).be.a("string");
        });
        it('should fail if string', function () {
            let r;
            // @ts-ignore
            const  j = isBFastOptions('1', r1=>r=r1)
            expect(j).be.a("boolean");
            expect(j).equal(false);
            expect(r).be.a("string");
        });
        it('should fail if function', function () {
            let r;
            // @ts-ignore
            const  j = isBFastOptions(()=>{}, r1=>r=r1)
            expect(j).be.a("boolean");
            expect(j).equal(false);
            expect(r).be.a("string");
        });
        it('should fail if array', function () {
            let r;
            // @ts-ignore
            const  j = isBFastOptions([], r1=>r=r1)
            expect(j).be.a("boolean");
            expect(j).equal(false);
            expect(r).be.a("string");
        });
        it('should pass if minimum required', function () {
            let r;
            const  j = isBFastOptions({
                applicationId: 'test', projectId: 'test', masterKey: 'test', port: 'test', databaseURI: 'test'
            }, r1=>r=r1);
            expect(j).be.a("boolean");
            expect(j).equal(true);
            expect(r).be.a("string");
            expect(r).be.empty
        });
    });
});