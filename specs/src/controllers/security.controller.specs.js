const assert = require("assert");
const {SecurityController} = require('../../../dist/controllers/security.controller');
const {config} = require('../../mock.config');

describe('SecurityController Integration Test', function () {
    const securityController = new SecurityController(config);
    it('should generate signed token', async function () {
        const token = await securityController.getToken({uid: 'test'});
        assert(typeof token === "string");
    });
    it('should verify token using public jwk', async function () {
        const token = await securityController.getToken({uid: 'test1'}, 1);
        const decoded = await securityController.verifyToken(token);
        assert(typeof decoded === "object");
        assert(decoded.uid === 'test1')
    });
    it('should not verify token when using public jwk and it is expired',  async function () {
        try{
            const token = await securityController.getToken({uid: 'test1'},0);
            await securityController.verifyToken(token);
        }catch (e){
            assert(e.toString() === 'JwtParseError: Jwt is expired');
        }
    });
});
