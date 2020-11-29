const axios = require('axios');
const {
    before,
    after,
    it,
    describe
} = require('mocha');
const {serverUrl} = require('../mock.config');
const assert = require('assert');

describe('QueryRule Integration Test', function () {
    let token;
    before(async function () {
        const authorizationRule = {
            applicationId: 'daas',
            masterKey: 'daas',
            Authentication: {
                signUp: {
                    username: 'joshua',
                    password: 'joshua',
                    email: 'joshua@gmail.com'
                }
            },
            Authorization: {
                rules: {
                    'create.*': `return true`,
                    'query.*': `return context.auth===true;`,
                }
            },
            CreateTest: [
                {
                    id: 'joshua',
                    name: 'joshua',
                    likes: {
                        movies: 'Action'
                    }
                },
                {
                    name: 'mshana',
                    height: '130cm',
                    likes: {
                        movies: 'Action'
                    }
                },
                {
                    name: 'eitan',
                    age: 20,
                    address: {
                        city: 'Dar Es Salaam'
                    }
                }
            ],
        }
        const response = await axios.post(serverUrl, authorizationRule);
        token = response.data['ResultOfAuthentication'].signUp.token;
    });

    after(async function () {
    });

    it('should query by id when applicationId supplied and and authorization require to auth', async function () {
        const queryRule = {
            applicationId: 'daas',
            token: token,
            QueryTest: {
                id: 'joshua',
                return: []
            }
        };
        const response = await axios.post(serverUrl, queryRule);
        assert(response.data.errors === undefined);
        assert(response.data['ResultOfQueryTest'] !== undefined);
        assert(typeof response.data['ResultOfQueryTest'] === "object");
        assert(!Array.isArray(response.data['ResultOfQueryTest']));
        assert(response.data['ResultOfQueryTest'].id === "joshua");
        assert(response.data['ResultOfQueryTest'].createdBy !== null);
    });

    it('should  not query if applicationId not supplied', async function () {
        const queryRule = {
            QueryTest: {
                id: 'joshua',
                return: []
            }
        };
        try {
            await axios.post(serverUrl, queryRule);
        } catch (e) {
            assert(e.response.status === 401);
            assert(e.response.data.message === 'unauthorized');
            assert(typeof e.response.data === 'object');
        }
    });

    it('should query by filter when applicationId supplied and authorization require auth to be true', async function () {
        const queryRule = {
            applicationId: 'daas',
            token: token,
            QueryTest: {
                filter: {
                    name: 'eitan'
                },
                return: []
            }
        };
        const response = await axios.post(serverUrl, queryRule);
        // console.log(response.data);
        assert(response.data.errors === undefined);
        assert(response.data['ResultOfQueryTest'] !== undefined);
        assert(Array.isArray(response.data['ResultOfQueryTest']));
        assert(response.data['ResultOfQueryTest'][0].name === "eitan");
        assert(response.data['ResultOfQueryTest'][0].createdBy !== null);
        assert(response.data['ResultOfQueryTest'].length === 1);
    });

    it('should not query when token not supplied and authorization require auth to be true', async function () {
        const queryRule = {
            applicationId: 'daas',
            QueryTest: {
                filter: {
                    name: 'eitan'
                },
                return: []
            }
        };
        const response = await axios.post(serverUrl, queryRule);
        // console.log(response.data);
        assert(response.data.errors !== undefined);
        assert(response.data['ResultOfQueryTest'] === undefined);
        assert(Array.isArray(response.data['errors']));
        assert(response.data['errors'][0].path === "Query.Test");
        assert(response.data['errors'][0].message === 'You have insufficient permission to this resource');
        assert(response.data['errors'].length === 1);
    });

    it('should not query when token is invalid and authorization require auth to be true', async function () {
        try {
            const queryRule = {
                applicationId: 'daas',
                token: '87t97tgkgoidohgfd.ipyouyfgiousdlkgrpiosdu.poyoirudfjkfd',
                QueryTest: {
                    filter: {
                        name: 'eitan'
                    },
                    return: []
                }
            };
            await axios.post(serverUrl, queryRule);
        } catch (e) {
            assert(e.response.status === 401);
            assert(e.response.data.message === 'bad token');
            assert(typeof e.response.data === 'object');
        }
    });

});
