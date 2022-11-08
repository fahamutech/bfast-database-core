import httpStatus from 'http-status-codes';
import {BFastOptions} from "../../bfast-option";
import {NextFunction, Request, Response} from 'express'
import {verifyToken} from '../security/security';

export function verifyApplicationId(
    request: any, response: any, next: any, options: BFastOptions
): void {
    const applicationId = request.body.applicationId;
    if (applicationId === options.applicationId) {
        request.body.context = {
            applicationId
        };
        next();
    } else response.status(httpStatus.UNAUTHORIZED).json({message: 'unauthorized'});
}

export function verifyRequestToken(
    request: Request, response: Response, next: NextFunction, options: BFastOptions
): void {
    const token = request.body.token;
    const headerToken = request.headers['x-bfast-token'];
    const masterKey = request.body.masterKey;
    if (masterKey === options.masterKey) {
        request.body.context.auth = true;
        request.body.context.uid = "masterKey";
        request.body.context.masterKey = masterKey;
        request.body.context.useMasterKey = true;
        next();
        return;
    }
    request.body.context.useMasterKey = false;
    const vToken = (tk) => {
        verifyToken(tk, options).then(value => {
            request.body.context.auth = true;
            request.body.context.uid = value.uid;
            next();
        }).catch(_ => {
            request.body.context.auth = false;
            request.body.context.uid = null;
            next();
        });
    }
    if (token && token !== '') vToken(token);
    else if (headerToken && headerToken !== '') vToken(headerToken);
    else {
        request.body.context.auth = false;
        request.body.context.uid = null;
        next();
    }
}

