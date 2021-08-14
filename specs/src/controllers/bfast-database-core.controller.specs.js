const assert = require("assert");
const {BfastDatabaseCore} = require('../../../dist/bfast-database-core');
const {config} = require('../../mock.config');

describe('Bfast Database Core Integration Specs', function () {
    it('should return error if required options not exist', function () {
        const bfastdbcore = new BfastDatabaseCore().init(config);
        // console.log(bfastdbcore.rest().jwk);
    });
});
