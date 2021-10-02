import * as bcrypt from 'bcryptjs';
import * as uuid from 'uuid';
import * as _jwt from 'jsonwebtoken';
import {BFastDatabaseOptions} from '../bfast-database.option';
import {createHash} from 'crypto';


export class SecurityController {

    constructor() {
    }

    sha256OfObject(data: { [key: string]: any }) {
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

    async getToken(
        data: { uid: string, [key: string]: any } = {uid: undefined},
        options: BFastDatabaseOptions,
        expire = 30,
        host = 'https://api.bfast.fahamutech.com',
    ) {
        const time = Math.floor(new Date().getTime() / 1000);
        let claims = {
            iss: host,
            sub: host,
            aud: host,
            iat: time,
            exp: new Date().getTime() + this.dayToMillSecond(expire)
        };
        claims = Object.assign(claims, data);
        // const jwk = this.getJwk(options.rsaKeyPairInJson);
        // const keyPEM = jwk.key.toPrivateKeyPEM();
        // const jwt = njwt.create(claims, keyPEM, jwk.alg);
        // jwt.setExpiration(new Date().getTime() + this.dayToMillSecond(expire));
        return _jwt.sign(claims, options.masterKey);
    }

    async verifyToken(token: string, options: BFastDatabaseOptions) {
        // const jwk = this.getJwk(options.rsaPublicKeyInJson);
        // const jwt = njwt.verify(token, jwk.key.toPublicKeyPEM(), jwk.alg);
        // return jwt.body.toJSON();
        return _jwt.verify(token,options.masterKey);
    }

    private getJwk(keyPair) {
        // const jwk = nodeJwk.JWK.fromObject(keyPair);
        // if (!jwk) {
        //     throw new Error('Huh, my key is not there...');
        // }
        return {};
    }
}
