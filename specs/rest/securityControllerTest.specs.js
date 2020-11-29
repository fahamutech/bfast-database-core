const {Security} = require('../../dist/controllers/SecurityController');
const assert = require('assert');

describe('Test SecurityController Controller', function () {

    let security;
    before(function () {
        security = new Security({
            adapters: {}
        });
    });

    it('should generate a random uid of v4', function () {
        const uuid = security.generateUUID();
        assert(uuid !== undefined);
        assert(typeof uuid === 'string');
        assert(uuid.split('-').length === 5);
    });

    it('should hash a plain password and compare with the original password', async function () {
        const hashedPassword = await security.hashPlainText('joshua');
        const passwordComparison = await security.comparePassword('joshua', hashedPassword);
        assert(hashedPassword !== undefined);
        assert(hashedPassword !== 'joshua');
        assert(typeof hashedPassword === 'string');
        assert(passwordComparison === true);
    });

    it('should hash a plain password and fail to compare with a false password', async function () {
        const hashedPassword = await security.hashPlainText('joshua');
        const passwordComparison = await security.comparePassword('ethan', hashedPassword);
        assert(hashedPassword !== undefined);
        assert(hashedPassword !== 'joshua');
        assert(typeof hashedPassword === 'string');
        assert(passwordComparison === false);
    });

    it('should generate a valid jwt token and verify it', async function () {
        const token = await security.generateToken({"uid": 'joshua'});
        const decoded = await security.verifyToken(token);
        assert(typeof token === 'string');
        assert(token !== undefined);
        assert(token.split('.').length === 3);
        assert(decoded !== undefined);
        assert(typeof decoded === "object");
        assert(decoded.uid === 'joshua');
        assert(decoded.iss === 'bfast::cloud');
        assert(decoded.iat !== undefined);
        assert(decoded.exp !== undefined);
    });

});
