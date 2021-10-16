const {config} = require('../../mock.config');
const {assert, should} = require('chai');
const {getToken, verifyToken} = require("../../../dist");

describe('SecurityController', function () {
    describe('getToken', function () {
        it('should generate signed token', async function () {
            const token = await getToken({uid: 'test'}, config);
            assert(typeof token === "string");
        });
    });
    describe('verifyToken', function () {
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
        it('should not verify token if its not string',  async function () {
            try{
                await verifyToken(788, config);
            }catch (e){
                // console.log(e);
                should().exist(e);
                // assert(e.toString() === 'JwtParseError: Jwt is expired');
            }
        });
    });
});
