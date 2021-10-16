import * as bcrypt from 'bcryptjs';
import * as uuid from 'uuid';
import * as _jwt from 'jsonwebtoken';
import {BFastOptions} from '../bfast-database.option';
import {createHash} from 'crypto';

export function generateUUID(): string {
    return uuid.v4();
}

export function sha256OfObject(data: { [key: string]: any }) {
    return createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex');
}

export function dayToMillSecond(days: number): number {
    return (days * 24 * 60 * 60 * 1000);
}

export async function comparePassword(plainPassword: string, hashPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashPassword);
}

export async function hashPlainText(plainText: string): Promise<string> {
    return await bcrypt.hash(plainText, 3);
}

export function decodeToken(token: string): { uid: string, [key: string]: any } {
    return _jwt.decode(token, {
        complete: true,
        json: true
    });
}

export async function getToken(
    data: { uid: string, [key: string]: any } = {uid: undefined},
    options: BFastOptions,
    expire = 30,
    host = 'https://api.bfast.fahamutech.com',
) {
    const time = Math.floor(new Date().getTime() / 1000);
    let claims = {
        iss: host,
        sub: host,
        aud: host,
        iat: time,
        exp: new Date().getTime() + dayToMillSecond(expire)
    };
    claims = Object.assign(claims, data);
    // const jwk = getJwk(options.rsaKeyPairInJson);
    // const keyPEM = jwk.key.toPrivateKeyPEM();
    // const jwt = njwt.create(claims, keyPEM, jwk.alg);
    // jwt.setExpiration(new Date().getTime() + dayToMillSecond(expire));
    return _jwt.sign(claims, options.masterKey);
}

export async function verifyToken(token: string, options: BFastOptions): Promise<any> {
    // const jwk = getJwk(options.rsaPublicKeyInJson);
    // const jwt = njwt.verify(token, jwk.key.toPublicKeyPEM(), jwk.alg);
    // return jwt.body.toJSON();
    // if (token === null || token === undefined) {
    //     throw {message: 'token is null or undefined'};
    // }
    try {
        return _jwt.verify(token, options.masterKey);
    } catch (e) {
        console.log(token);
        console.log(e);
        return {uid: null};
    }
}
