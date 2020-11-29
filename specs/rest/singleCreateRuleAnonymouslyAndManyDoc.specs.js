const {
    before,
    after,
    it,
    describe
} = require('mocha');
const {serverUrl} = require('../mock.config');
const assert = require('assert');

describe('CreateRule with Many Document & Default Database', function () {

    it('Create Many Resource Anonymously and Return specified fields', async function () {
        const response = await axios.post(serverUrl, {
            applicationId: 'daas',
            createTest: [
                {
                    name: 'joshua',
                    return: ['id', 'createdAt']
                },
                {
                    name: 'eitan',
                    return: ['id']
                }
            ]
        });
        const data = response.data;
        console.log(data);
        assert(typeof data === 'object');
        assert(Array.isArray(data.Test));
        assert(data.Test.length === 2);
        assert(data.errors === undefined);
    });

});
