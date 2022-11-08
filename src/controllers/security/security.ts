import * as bcrypt from 'bcryptjs';
import * as uuid from 'uuid';
import * as _jwt from 'jsonwebtoken';
import {BFastOptions} from '../../bfast-option';
import {validateInput} from "../index";
import {StringSchema} from "../../models/string";

export function generateUUID(): string {
    return uuid.v4();
}

// export function sha256OfObject(data: { [key: string]: any }) {
//     return createHash('sha256')
//         .update(JSON.stringify(data))
//         .digest('hex');
// }

export async function comparePlainTextWithSaltedHash(plainPassword: string, hashPassword: string): Promise<boolean> {
    await validateInput(plainPassword, StringSchema, 'invalid plain text')
    await validateInput(hashPassword, StringSchema, 'invalid salted text')
    return await bcrypt.compare(plainPassword, hashPassword);
}

export async function saltHashPlainText(plainText: string): Promise<string> {
    await validateInput(plainText, StringSchema, 'invalid plain text')
    return await bcrypt.hash(plainText, 3);
}

export async function generateToken(
    data: { [key: string]: any } = {uid: undefined},
    options: BFastOptions,
    expire: any = '30d',
    host = 'https://*.bfast.fahamutech.com',
) {
    await validateInput(data, {type: 'object'}, 'invalid data, must be a map.');
    return _jwt.sign(data, options.masterKey, {expiresIn: expire, audience: host});
}

export async function verifyToken(token: string, options: BFastOptions): Promise<any> {
    await validateInput(token, StringSchema, 'invalid token')
    return _jwt.verify(token, options.masterKey);
}
