const axios = require('axios');
const {serverUrl} = require('../mock.config');
const assert = require('assert');
const {
    before,
    after,
    it,
    describe
} = require('mocha');

describe('Authentication Integration Test', function () {
    before(async function () {
        const user = {
            applicationId: 'daas',
            Authentication: {
                signUp: {
                    username: 'joshua2',
                    password: 'joshua2',
                    email: 'joshua2@gmail.com'
                }
            }
        };
        await axios.post(serverUrl, user);
    });
    after(async function () {
    });

    it('should send a reset password email', async function () {
        const user1 = {
            applicationId: 'daas',
            Authentication: {
                resetPassword: {
                    email: 'joshua2@gmail.com'
                }
            }
        };
        const response1 = await axios.post(serverUrl, user1);
        const data = response1.data;
        // console.log(data);
        assert(typeof data === "object");
        assert(typeof data['ResultOfAuthentication'] === "object");
        assert(typeof data['errors'] === "object");
        assert(Array.isArray(data['errors']));
        assert(data['errors'].length === 1);
    });

    it('should signIn a registered user', async function () {
        const user1 = {
            applicationId: 'daas',
            Authentication: {
                signIn: {
                    username: 'joshua2',
                    password: 'joshua2',
                }
            }
        };
        const response1 = await axios.post(serverUrl, user1);
        const data = response1.data;
        // console.log(data);
        assert(typeof data === "object");
        assert(typeof data['ResultOfAuthentication'].signIn !== "undefined");
        assert(data['ResultOfAuthentication'].signIn.token !== undefined);
        assert(typeof data['ResultOfAuthentication'].signIn.token === 'string');
        assert(data['ResultOfAuthentication'].signIn.username !== undefined);
        assert(data['ResultOfAuthentication'].signIn.email !== undefined);
        assert(data['ResultOfAuthentication'].signIn.id !== undefined);
        assert(data['ResultOfAuthentication'].signIn.id !== undefined);
        assert(data['ResultOfAuthentication'].signIn.createdAt !== undefined);
        assert(data['ResultOfAuthentication'].signIn.updatedAt !== undefined);
        assert(data['ResultOfAuthentication'].signIn.username === 'joshua1');
        assert(data['ResultOfAuthentication'].signIn.email === 'joshua1@gmail.com');
    });

    it('should create a new user', async function () {
        const user = {
            applicationId: 'daas',
            Authentication: {
                signUp: {
                    username: 'joshua',
                    password: 'joshua',
                    email: 'joshua@gmail.com'
                }
            }
        };
        const response = await axios.post(serverUrl, user);
        const data = response.data;
        // console.log(data);
        assert(typeof data === "object");
        assert(typeof data['ResultOfAuthentication'].signUp !== "undefined");
        assert(data['ResultOfAuthentication'].signUp.token !== undefined);
        assert(typeof data['ResultOfAuthentication'].signUp.token === 'string');
        assert(data['ResultOfAuthentication'].signUp.username !== undefined);
        assert(data['ResultOfAuthentication'].signUp.email !== undefined);
        assert(data['ResultOfAuthentication'].signUp.id !== undefined);
        assert(data['ResultOfAuthentication'].signUp.id !== undefined);
        assert(data['ResultOfAuthentication'].signUp.createdAt !== undefined);
        assert(data['ResultOfAuthentication'].signUp.updatedAt !== undefined);
        assert(data['ResultOfAuthentication'].signUp.username === 'joshua');
        assert(data['ResultOfAuthentication'].signUp.email === 'joshua@gmail.com');
    });
});
