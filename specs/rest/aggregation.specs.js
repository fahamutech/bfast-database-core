const axios = require('axios').default;
const {serverUrl, daas, config} = require('../mock.config');
const assert = require('assert');

describe('Aggregation', function () {
    // let _daas ;
    // before(async function(){
    //     _daas = await daas();
    //     _daas.init(config)
    // });
    //
    // after(function(){
    //     _daas
    // });

    it('should be able to perform aggregation', async function () {
        const aggregation = {
            applicationId: 'daas',
            createTest: [
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
            aggregateTest: [
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
    //    console.log(data);
        assert(typeof data !== "undefined");
        assert(typeof data === "object");
        assert(typeof data['ResultOfAggregateTest'] !== "undefined");
        assert(Array.isArray(data['ResultOfAggregateTest']) === true);
        assert(data['ResultOfAggregateTest'].length === 2);
    });
});
