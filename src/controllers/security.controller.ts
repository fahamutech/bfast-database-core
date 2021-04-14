import * as bcrypt from 'bcryptjs';
import * as _jwt from 'jsonwebtoken';
import * as uuid from 'uuid';
import nodeJwk from 'node-jwk';
import njwt from 'njwt';
import {BFastDatabaseOptions} from '../bfast-database.option';


export class SecurityController {

    constructor(private readonly options: BFastDatabaseOptions) {
    }

    dayToMillSecond(days: number): number {
        // const daysInNumber = parseFloat(days.replace(new RegExp('[^0-9]', 'ig'), ''));
        return (days * 24 * 60 * 60 * 1000);
    }

    async comparePassword(plainPassword: string, hashPassword: string): Promise<boolean> {
        return await bcrypt.compare(plainPassword, hashPassword);
    }

    async hashPlainText(plainText: string): Promise<string> {
        return await bcrypt.hash(plainText, 10);
    }

    async revokeToken(token: string): Promise<any> {
        // await this.databaseController.update('_Token', {
        //     id: token.toString().split('.')[1].trim(),
        //     update: {
        //         $set: {
        //             token: null
        //         }
        //     },
        //     upsert: true,
        //     options: {
        //         upsert: true
        //     }
        // }, {
        //     auth: true,
        //     useMasterKey: true,
        // }, {
        //     bypassDomainVerification: true,
        //     dbOptions: {
        //         upsert: true
        //     }
        // });
        return {message: 'token not revoked'};
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
        // this.databaseController.query('_Token', {
        //     id: token.toString().split('.')[1].trim(),
        //     return: []
        // }, {
        //     useMasterKey: true,
        //     auth: true
        // }, {
        //     bypassDomainVerification: true
        // }).then(value => {
        //     if (value && value.token === token) {
        //         resolve(data);
        //     } else {
        //         reject({message: 'Invalid token'});
        //     }
        // }).catch(_ => {
        //     reject({message: 'Invalid token', reason: _ && _.message ? _.message : _.toString()});
        // });
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
