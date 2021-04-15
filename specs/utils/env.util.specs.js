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

    it('should return a json if content of a file is JSON', async function () {
        const rsa = await new EnvUtil().getEnv(__dirname + '/rsakey.valid.json');
        assert(rsa !== undefined);
        assert(typeof rsa === "object");
    });
    it('should return a string if content of a file is not valid json format', async function () {
        const rsa = await new EnvUtil().getEnv(__dirname + '/rsakey.invalid.json');
        assert(rsa !== undefined);
        assert(typeof rsa === "string");
    });
    it('should return a json if env content is object in string', async function () {
        const objectInString = await new EnvUtil().getEnv('{"name":"joshua"}');
        assert(objectInString !== undefined);
        assert(typeof objectInString === "object");
        assert(objectInString.name === "joshua");
        assert(typeof objectInString.name === "string");
    });
});
