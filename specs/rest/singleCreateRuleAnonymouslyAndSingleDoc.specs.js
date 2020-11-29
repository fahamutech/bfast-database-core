const axios = require('axios');
const {
    before,
    after,
    it,
    describe
} = require('mocha');
const {serverUrl} = require('../mock.config');
const assert = require('assert');

describe('CreateRule With Single Document & Default Database', function () {

    it('should create a resource anonymous and return all fields include defaults', async function () {
        const rule = {
            applicationId: 'daas',
            CreateTest: {
                name: 'joshua',
                return: []
            }
        }
        const response = await axios.post('http://localhost:3000/daas', rule);
        const data = response.data;
        console.log(data);
        assert(typeof data === 'object');
        assert(typeof data.Test === 'object');
        assert(data.errors === undefined);
        assert(data.Test["createdAt"]);
        assert(data.Test["updatedAt"]);
        assert(data.Test["id"]);
        assert(data.Test["createdBy"] === null);
        assert(data.Test["name"] === 'joshua');
    });

    it('should create a resource anonymous with a specified id and return all fields include defaults', async function () {
        const rule = {
            applicationId: 'daas',
            CreateTest: {
                id: 'joshua',
                name: 'joshua',
                return: []
            }
        }
        const response = await axios.post('http://localhost:3000/daas', rule);
        const data = response.data;
        console.log(data);
        assert(typeof data === 'object');
        assert(typeof data.Test === 'object');
        assert(data.errors === undefined);
        assert(data.Test["id"] === 'joshua');
        assert(data.Test["id"]);

    });

    it('should create a resource anonymous and return only specified fields', async function () {
        const rule = {
            applicationId: 'daas',
            CreateTest: {
                name: 'joshua',
                return: ['id', 'createdAt']
            }
        }
        const response = await axios.post('http://localhost:3000/daas', rule);
        const data = response.data;
        console.log(data);
        assert(typeof data === 'object');
        assert(typeof data.Test === 'object');
        assert(data.errors === undefined);
        assert(Object.keys(data.Test).length === 2);
        assert(data.Test['id']);
        assert(typeof data.Test['id'] === 'string');
        assert(data.Test['createdAt']);
        assert(typeof data.Test['createdAt'] === 'string');
    });

    it('should create a resource anonymous with no return field', async function () {
        const rule = {
            applicationId: 'daas',
            CreateTest: {
                name: 'joshua',
                // return: ['id','createdAt']
            }
        }
        const response = await axios.post('http://localhost:3000/daas', rule);
        const data = response.data;
        console.log(data);
        assert(typeof data === 'object');
        assert(typeof data.Test === 'object');
        assert(data.errors === undefined);
        assert(Object.keys(data.Test).length === 1);
        assert(data.Test['id']);
        assert(typeof data.Test['id'] === 'string');
    });


});
