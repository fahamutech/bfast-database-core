const axios = require('axios');
const {serverUrl} = require('../mock.config');
const assert = require('assert');
const {
    before,
    after,
    it,
    describe
} = require('mocha');

describe('Authorization', function () {

    describe('Add Authorization Policy', function () {
        it('should add a permission policy to a resource url', async function () {
            const authorization = {
                applicationId: 'daas',
                masterKey: 'daas',
                Authorization: {
                    rules: {
                        "create.Product": `const uid = context.uid;return auth === true;`,
                    }
                }
            };
            const response = await axios.post(serverUrl, authorization);
            const data = response.data;
            console.log(JSON.stringify(data));
            assert(typeof data !== "undefined");
            assert(typeof data === "object");
            assert(typeof data['ResultOfAuthorization'] === "object");
            assert(data['ResultOfAuthorization'].rules !== undefined);
            assert(typeof data['ResultOfAuthorization'].rules === "object");
            assert(typeof data['ResultOfAuthorization'].rules['create.Product'] === "object");
            assert(data['ResultOfAuthorization'].rules['create.Product'].ruleId === "create.Product");
            assert(data['ResultOfAuthorization'].rules['create.Product'].ruleBody === "const auth = context.auth;const uid = context.uid;return auth === true;");
            assert(data['ResultOfAuthorization'].rules['create.Product'].createdAt !== undefined);
            assert(data['ResultOfAuthorization'].rules['create.Product'].updatedAt !== undefined);
            assert(data['ResultOfAuthorization'].rules['create.Product'].id !== undefined);
        });
    });

    describe('Non Authorized Request', function () {
        it('should protect create a resource for non authorized request', async function () {
            const authorization = {
                applicationId: 'daas',
                CreateTest: {
                    name: 'joshua',
                    age: 20,
                    return: []
                }
            };
            const response = await axios.post(serverUrl, authorization);
            console.log(response.data);
        });
    });

    describe('Authorized request', function () {
        it('should allow create a resource for authorized request', async function () {
            const authentication = {
                applicationId: 'daas',
                Authentication: {
                    signUp: {
                        username: 'joshua',
                        password: 'joshua',
                        email: 'mama27j@gmail.com'
                    }
                }
            }
            const authResponse = await axios.post(serverUrl, authentication);
            const token = authResponse.data['ResultOfAuthentication']['signUp'].token;
            const authorization = {
                applicationId: 'daas',
                token: token,
                CreateProduct: {
                    name: 'joshua',
                    age: 20,
                    return: []
                }
            };
            const response = await axios.post(serverUrl, authorization);
            const data = response.data;
            console.log(data);
            assert(typeof data !== "undefined");
            assert(typeof data === "object");
            assert(data['ResultOfCreateProduct'] === undefined);
            assert(data['errors'] !== undefined);
            assert(Array.isArray(data['errors']));
            assert(data['errors'][0]['path'] === 'Create.Product');
        });
    });

});
