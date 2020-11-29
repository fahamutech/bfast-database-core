const axios = require('axios');
const {serverUrl} = require('../mock.config');
const assert = require('assert');
const {
    before,
    after,
    it,
    describe
} = require('mocha');

describe('Delete document anonymous', function () {
    before(async function () {
    });
    after(async function () {
    });

    it('should delete a document with an id supplied and without login and any authorization permission set', async function () {
        const createTest = {
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
                    id: "y987ukj90997",
                    age: 20,
                    year: 2090,
                    message: 'hello, Z!',
                    return: []
                }
            ]
        }
        await axios.post(serverUrl, createTest);
        // console.log(createResponse.data);
        const deleteTest = {
            applicationId: 'daas',
            DeleteTest: {
                id: 'ethan',
                filter: {
                    age: 20
                },
                return: []
            }
        }
        const deleteResponse = await axios.post(serverUrl, deleteTest);
        console.log(deleteResponse.data);
        const queryTest = {
            applicationId: 'daas',
            QueryTest: {
                return: []
            }
        }
        const queryResponse = await axios.post(serverUrl, queryTest);
        console.log(queryResponse.data);
    });
});
