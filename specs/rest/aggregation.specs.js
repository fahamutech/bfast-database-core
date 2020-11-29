const axios = require('axios');
const {serverUrl} = require('../mock.config');
const assert = require('assert');

describe('Aggregation', function () {

    it('should be able to perform aggregation', async function () {
        const aggregation = {
            applicationId: 'daas',
            masterKey: 'daas',
            CreateTest: [
                {
                    role: 'manager',
                    salary: 20
                },
                {
                    role: 'manager',
                    salary: 26
                },
                {
                    role: 'cashier',
                    salary: 10
                }
            ],
            AggregateTest: [
                {
                    $group: {
                        _id: '$role',
                        salary: {$sum: '$salary'}
                    }
                }
            ]
        }
        const aggregationResponse = await axios.post(serverUrl, aggregation);
        const data = aggregationResponse.data;
       // console.log(data);
        assert(typeof data !== "undefined");
        assert(typeof data === "object");
        assert(typeof data['ResultOfAggregateTest'] !== "undefined");
        assert(Array.isArray(data['ResultOfAggregateTest']) === true);
        assert(data['ResultOfAggregateTest'].length === 2);
    });
});
