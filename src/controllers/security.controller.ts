import * as bcrypt from 'bcryptjs';
import * as _jwt from 'jsonwebtoken';
import * as uuid from 'uuid';
import nodeJwk from 'node-jwk';
import njwt from 'njwt';
import {BFastDatabaseOptions} from '../bfast-database.option';
import { createHash } from 'crypto';


export class SecurityController {

    constructor(private readonly options: BFastDatabaseOptions) {
    }

    sha256OfObject(data: {[key: string]: any}){
        return createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex');
    }

    dayToMillSecond(days: number): number {
        return (days * 24 * 60 * 60 * 1000);
    }

    async comparePassword(plainPassword: string, hashPassword: string): Promise<boolean> {
        return await bcrypt.compare(plainPassword, hashPassword);
    }

    async hashPlainText(plainText: string): Promise<string> {
        return await bcrypt.hash(plainText, 3);
    }

    decodeToken(token: string): { uid: string, [key: string]: any } {
        return _jwt.decode(token, {
            complete: true,
            json: true
        });
    }

    generateUUID(): string {
        return uuid.v4();
    }

    /**
     * generate new token and whitelist it
     * @param data {{[key: string]: any}}
     * @param host {string}
     * @param expire {string} - days for token to expire
     * @return {*}
     */
    async getToken(data: { uid: string, [key: string]: any } = {uid: undefined}, expire = 30, host = 'https://api.bfast.fahamutech.com') {
        const time = Math.floor(new Date().getTime() / 1000);
        let claims = {
            iss: host,
            sub: host,
            aud: host,
            iat: time,
            exp: new Date().getTime() + this.dayToMillSecond(expire)
        };
        claims = Object.assign(claims, data);
        const jwk = this.getJwk(this.options.rsaKeyPairInJson);
        const keyPEM = jwk.key.toPrivateKeyPEM();
        const jwt = njwt.create(claims, keyPEM, jwk.alg);
        jwt.setExpiration(new Date().getTime() + this.dayToMillSecond(expire));
        return jwt.compact();
    }

    /**
     * verify token and check for blacklist
     * @param token {string}
     * @return {JwtBody}
     */
    async verifyToken(token) {
        const jwk = this.getJwk(this.options.rsaPublicKeyInJson);
        const jwt = njwt.verify(token, jwk.key.toPublicKeyPEM(), jwk.alg);
        return jwt.body.toJSON();
    }

    /**
     * get jwk to give external service
     * for verifying the token
     * @param keyPair {*}
     * @return {JWK}
     */
    private getJwk(keyPair) {
        const jwk = nodeJwk.JWK.fromObject(keyPair);
        if (!jwk) {
            throw new Error('Huh, my key is not there...');
        }
        return jwk;
    }
}
