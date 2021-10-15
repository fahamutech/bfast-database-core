const {config} = require('../../mock.config');
const {assert} = require('chai');
const {getToken, verifyToken} = require("../../../dist/cjs/controllers/security.controller");

describe('SecurityController Integration Test', function () {
    it('should generate signed token', async function () {
        const token = await getToken({uid: 'test'}, config);
        assert(typeof token === "string");
    });
    it('should verify token using public jwk', async function () {
        const token = await getToken({uid: 'test1'}, config,1);
        const decoded = await verifyToken(token, config);
        assert(typeof decoded === "object");
        assert(decoded.uid === 'test1')
    });
    it('should not verify token when using public jwk and it is expired',  async function () {
        try{
            const token = await getToken({uid: 'test1'},config, 0);
            await verifyToken(token, config);
        }catch (e){
            assert(e.toString() === 'JwtParseError: Jwt is expired');
        }
    });
});
