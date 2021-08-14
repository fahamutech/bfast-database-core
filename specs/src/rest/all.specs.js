const {mongoRepSet} = require('../../mock.config');
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
