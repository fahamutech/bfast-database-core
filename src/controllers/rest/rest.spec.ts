import {verifyApplicationId, verifyRequestToken} from "./rest";
import {loadEnv} from "../../utils";
import {expect} from "chai";
import httpStatus from "http-status-codes";
import {generateToken} from "../security/security";

let options;

describe('RestController', function () {
    beforeEach(() => options = loadEnv())
    describe('verifyApplicationId', function () {
        it('should call next when appid is correct', function (done) {
            const request = {body: {applicationId: options.applicationId}}
            verifyApplicationId(request, null, done, options)
        });
        it('should respond with unauthorised when application id is not the same.', function (done) {
            let status;
            const request = {body: {applicationId: 'abc'}}
            const response = {
                status: (code: number) => {
                    status = code
                    return {
                        json: (value: any) => {
                            expect(status).equal(httpStatus.UNAUTHORIZED)
                            expect(value).eql({message: 'unauthorized'})
                            done()
                        }
                    }
                },
            }
            verifyApplicationId(request, response, null, options)
        });
    });
    describe('verifyRequestToken', function () {
        it('should update context to auth true when token is true', function (done) {
            generateToken({uid: 'test'}, options).then(token => {
                const request = {
                    headers: {},
                    body: {
                        token: token,
                        context: {}
                    }
                }
                verifyRequestToken(request, null, () => {
                    expect(request.body.context).eql({
                        auth: true,
                        useMasterKey: false,
                        uid: 'test'
                    })
                    done()
                }, options)
            }).catch(reason => {
                throw reason
            })
        });
        it('should update context to auth true when token is true and applied in headers', function (done) {
            generateToken({uid: 'test'}, options).then(token => {
                const request = {
                    headers: {
                        'x-bfast-token': token,
                    },
                    body: {
                        context: {}
                    }
                }
                verifyRequestToken(request, null, () => {
                    expect(request.body.context).eql({
                        auth: true,
                        useMasterKey: false,
                        uid: 'test'
                    })
                    done()
                }, options)
            }).catch(reason => {
                throw reason
            })
        });
        it('should update context to auth false when token is invalid', function (done) {
            const request = {
                headers: {},
                body: {
                    token: 'bad',
                    context: {}
                }
            }
            verifyRequestToken(request, null, () => {
                expect(request.body.context).eql({
                    auth: false,
                    useMasterKey: false,
                    uid: null
                })
                done()
            }, options)
        });
        it('should update context to auth false when token is invalid and supplied throw header', function (done) {
            const request = {
                headers: {
                    'x-bfast-token': 'bad'
                },
                body: {
                    context: {}
                }
            }
            verifyRequestToken(request, null, () => {
                expect(request.body.context).eql({
                    auth: false,
                    useMasterKey: false,
                    uid: null
                })
                done()
            }, options)
        });
        it('should update context to auth false when token is null', function (done) {
            const request = {
                headers: {},
                body: {
                    token: null,
                    context: {}
                }
            }
            verifyRequestToken(request, null, () => {
                expect(request.body.context).eql({
                    auth: false,
                    useMasterKey: false,
                    uid: null
                })
                done()
            }, options)
        });
        it('should update context to auth false when token is undefined', function (done) {
            const request = {
                headers: {},
                body: {
                    token: undefined,
                    context: {}
                }
            }
            verifyRequestToken(request, null, () => {
                expect(request.body.context).eql({
                    auth: false,
                    useMasterKey: false,
                    uid: null
                })
                done()
            }, options)
        });
        it('should update context to auth true when masterKey supplied', function (done) {
            const request = {
                headers: {},
                body: {
                    token: null,
                    masterKey: options.masterKey,
                    context: {}
                }
            }
            verifyRequestToken(request, null, () => {
                expect(request.body.context).eql({
                    auth: true,
                    useMasterKey: true,
                    uid: 'masterKey',
                    masterKey: options.masterKey
                })
                done()
            }, options)
        });
    });
});
