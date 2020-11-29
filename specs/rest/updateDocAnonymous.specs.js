const axios = require('axios');
const {serverUrl, } = require('../mock.config');
const assert = require('assert');

describe('Update Document Anonymous', function () {
    before(async function () {
        await axios.post(serverUrl, {
            applicationId: 'daas',
            CreateTest: [
                {
                    id: 'ethan',
                    age: 20,
                    year: 2020,
                    message: 'hello, world!',
                    return: []
                },
                {
                    id: "568576g78ti78",
                    age: 20,
                    year: 2090,
                    message: 'hello, Z!',
                    return: []
                }
            ]
        });
    });
    after(async function () {
    });

    it('should fails to update a document with an id supplied', async function () {
        const updateResponse = await axios.post(serverUrl, {
            applicationId: 'daas',
            UpdateTest: {
                id: 'ethan',
                // filter: {
                //     age: 20
                // },
                update: {
                    $set: {age: 30},
                },
                return: ['updatedAt']
            }
        });
        console.log(updateResponse.data);
    });
});
