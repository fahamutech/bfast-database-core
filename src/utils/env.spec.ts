import {assert, expect, should} from 'chai';
import {getEnv, loadEnv} from "./env";
import {config} from "../../test";

describe('EnvUtil', function () {
    before(async function () {
        process.env.S3 = __dirname + '/s3.txt';
        process.env.PRODUCTION = '1';
    })
    describe('getEnv', function () {
        it('should return content of file if env is path', async function () {
            const s3 = getEnv(process.env.S3);
            assert(s3 === 's3-file-content');
            assert(s3 !== undefined);
            assert(s3 !== null);
        });
        it('should return self env if its not file', async function () {
            const s3 = getEnv('s3');
            assert(s3 === 's3');
            assert(s3 !== undefined);
            assert(s3 !== null);
        });
        it('should return self env if file path is not valid', async function () {
            const s3 = getEnv(__dirname + '/../../s3');
            expect(s3).equal(__dirname + '/../../s3');
            should().exist(s3);
            should().exist(s3);
        });
        it('should return a json if content of a file is JSON', async function () {
            const rsa = getEnv(__dirname + '/rsakey.valid.json');
            assert(rsa !== undefined);
            assert(typeof rsa === "object");
        });
        it('should return a string if content of a file is not valid json format', async function () {
            const rsa = getEnv(__dirname + '/rsakey.invalid-json.txt');
            assert(rsa !== undefined);
            assert(typeof rsa === "string");
        });
        it('should return a json if env content is object in string', async function () {
            const objectInString = getEnv('{"name":"joshua"}');
            assert(objectInString !== undefined);
            assert(typeof objectInString === "object");
            assert(objectInString.name === "joshua");
            assert(typeof objectInString.name === "string");
        });
    });
    describe('loadEnv', function () {
        it('should auto load default envs to bfast options object', function () {
            const options = loadEnv();
            config.useLocalIpfs = options.useLocalIpfs;
            should().exist(options);
            expect(options.applicationId).eql('bfast');
            expect(typeof options).equal('object');
            expect(options).eql(config);
        });
    });
});
