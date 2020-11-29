const {mongoRepSet, daas} = require('../mock.config');
let mongoMemoryServer;
let daaSServer;
const glob = require('glob');

describe('All Test', function () {
    before(async function () {
        this.timeout(10000000000000000);
        try {
            mongoMemoryServer = mongoRepSet();
            await mongoMemoryServer.start();
            await mongoMemoryServer.waitUntilRunning();
            daaSServer = await daas();
            await daaSServer.start({
                mongoDbUri: await mongoMemoryServer.getUri(),
                applicationId: 'daas',
                port: 3111,
                adapters: {
                    // s3Storage: {
                    //     bucket: 'daas',
                    //     direct: false,
                    //     accessKey: '5IGXSX5CU52C2RFZFALG',
                    //     secretKey: '2q2vteO9lQp6LaxT3lGMLdkUF5THdxZWmyWmb1y9',
                    //     endPoint: 'https://eu-central-1.linodeobjects.com/'
                    // }
                },
                mountPath: '/daas',
                masterKey: 'daas'
            });
        } catch (e) {
            console.log(e);
        }
    });
    after(async function () {
        await mongoMemoryServer.stop();
        await daaSServer.stop();
    });

    const testPath = __dirname
    const files = glob.sync('**/*.js', {absolute: true, cwd: testPath, ignore: ['**/all.specs.js']});
    files.forEach(file => {
        require(file);
    });
});
