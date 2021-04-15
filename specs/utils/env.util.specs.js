// const {EnvUtil} = require('../../../dist/daas/esm2015');
const {EnvUtil} = require("../../dist/utils/env.util");

const assert = require('assert');

describe('Env Utils Unit Test', function () {
    before(async function () {
        process.env.S3 = __dirname + '/s3.txt';
        process.env.PRODUCTION = '1';
    })
    it('should return content of file if env is path', async function () {
        const s3 = await new EnvUtil().getEnv(process.env.S3);
        assert(s3 === 's3-file-content');
        assert(s3 !== undefined);
        assert(s3 !== null);
    });
    it('should return self env if its not file', async function () {
        const s3 = await new EnvUtil().getEnv('s3');
        assert(s3 === 's3');
        assert(s3 !== undefined);
        assert(s3 !== null);
    });

    it('should return self env if file path is not valid', async function () {
        const s3 = await new EnvUtil().getEnv(__dirname + '/s3');
        assert(s3 === __dirname + '/s3');
        assert(s3 !== undefined);
        assert(s3 !== null);
    });
});
