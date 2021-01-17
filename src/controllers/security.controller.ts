import * as bcrypt from 'bcryptjs';
import * as _jwt from 'jsonwebtoken';
import * as uuid from 'uuid';
import {DatabaseAdapter} from '../adapters/database.adapter';

const jwtPassword =
    `MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDFg6797ocIzEPK
mk96COGGqySke+nVcJwNvuGqynxvahg6OFHamg29P9S5Ji73O1t+3uEhubv7lbaF
f6WA1xnLzPSa3y3OdkFDUt8Px0SwnSJRxgNVG2g4gT6pA/huuJDuyleTPUKAqe/4
Ty/jbmj+dco+nTXzxo2VDB/uCGUTibPE7TvuAG3O5QbYVM2GBEPntha8L3IQ9GKc
0r+070xbqPRL5mKokySTm6FbCT2hucL4YlOWAfkdCYJp64up8THbsMBi1e9mUgwl
8etXcs2z0UybQSQzA4REy+3qmIIvZ3m9xLsNGAVcJ7aXkfPSajkYvvVJFXmz35Nh
bzrJW7JZAgMBAAECggEABAX9r5CHUaePjfX8vnil129vDKa1ibKEi0cjI66CQGbB
3ZW+HRzcQMmnFKpxdHnSEFCL93roGGThVfDWtzwqe1tOdEUtkrIX/D4Y6yJdBNf+
lfnZoYcwZU5Er360NdUupp6akBZEX4i 878765iufiy 6c76375wi ogiyurv76
iuyo8tiutititign giufygyituugWqdE7IX/jRaOynfnn2nJl+e5ITDoBjRdMi
yZcg4fhWMw9NGoiv21R1oBX5TibPE7TvuAG3O5QbYVM2GBEPntha8L3IQ9GKci8y
0r+070xbqPRL5mKokySTm6FbCT2hucL4YlOWAfkdCYJp64up8THbsMBi1e9mUgwl
8etXcs2z0UybQSQzA4REy+3qmIIvZ3m9xLsNGAVcJ7aXkfPSajkYvvVJFXmz35Nh
bzrJW7JZAgMBAAECggEABAX9r5CHUaePjfX8vnil129vDKa1ibKEi0cjI66CQGbB
3ZW+HRzcQMmnFKpxdHnSiruupq+MwnYoSvDv21hfCfkQDXvppQkXe72S+oS2vrJr
JLcWQ6hFDpecIaaCJiqAXvFACr`;


//todo: we need to change supplying of dependencies to use DI
export class SecurityController {

    constructor() {
    }

    private static dayToSecond(day: string): number {
        const days = day ? day : '7d';
        const daysInNumber = days.replace('d', '') as unknown as number;
        return (daysInNumber * 86400);
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

    async generateToken(data: { uid: string, [key: string]: any } = {uid: undefined}, expire?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!data.uid) {
                reject({message: 'Invalid data in payload'});
                return;
            }
            _jwt.sign(data, jwtPassword, {
                expiresIn: expire ? expire : '1d',
                issuer: 'bfast::cloud::database'
            }, async (err, encoded) => {
                if (err) {
                    reject({message: 'Fails to generate a token', reason: err.toString()});
                    return;
                }
                // this.databaseController.update('_Token', {
                //     id: encoded.toString().split('.')[1].trim(),
                //     update: {
                //         $set: {
                //             token: encoded
                //         }
                //     },
                //     upsert: true,
                //     options: {
                //         upsert: true
                //     },
                //     return: []
                // }, {
                //     auth: true,
                //     useMasterKey: true,
                // }, {
                //     bypassDomainVerification: true,
                //     dbOptions: {
                //         upsert: true
                //     }
                // }).then(_ => {
                    resolve(encoded);
                // }).catch(reason => {
                //     reject(reason);
                // });
            });
        });
    }

    async verifyToken<T>(token: string): Promise<T> {
        return new Promise((resolve, reject) => {
            _jwt.verify(token, jwtPassword, {
                issuer: 'bfast::cloud::database'
            }, (err, decoded: any) => {
                if (err) {
                    reject({message: 'Fails to verify token', reason: err.toString()});
                } else {
                    const data = JSON.parse(JSON.stringify(decoded));
                    if (data && data.uid) {
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
                                resolve(data);
                        //     } else {
                        //         reject({message: 'Invalid token'});
                        //     }
                        // }).catch(_ => {
                        //     reject({message: 'Invalid token', reason: _ && _.message ? _.message : _.toString()});
                        // });
                    } else {
                        reject({message: 'Invalid data in token'});
                    }
                }
            });
        });
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
}
