import httpStatus, {StatusCodes} from 'http-status-codes';
import {RuleResponse} from '../models/rules.model';
import formidable from 'formidable';
import {readFile} from 'fs';
import {promisify} from "util";
import mime from 'mime';
import {BFastOptions} from "../bfast-database.option";
import {NextFunction, Request, Response} from 'express'
import {AuthAdapter} from "../adapters/auth.adapter";
import {FilesAdapter} from "../adapters/files.adapter";
import {verifyToken} from './security.controller';
import {hasPermission} from "./auth.controller";
import {
    handleAuthenticationRule,
    handleAuthorizationRule,
    handleBulkRule,
    handleCreateRules,
    handleDeleteRules,
    handleQueryRules,
    handleStorageRule,
    handleUpdateRules
} from "./rules.controller";
import {
    fileInfo,
    handleGetFileBySignedUrl,
    handleGetFileRequest,
    isS3,
    listFiles,
    saveFromBuffer
} from "./storage.controller";
import {devLog} from "../utils/debug.util";

export function getFile(
    request: Request,
    response: Response,
    _: NextFunction,
    filesAdapter: FilesAdapter,
    options
): void {
    if (request?.method?.toString()?.toLowerCase() === 'head') {
        fileInfo(request, response, filesAdapter, options);
    } else if (isS3(filesAdapter) === true) {
        handleGetFileBySignedUrl(
            request,
            response,
            false,
            filesAdapter,
            options
        );
    } else {
        handleGetFileRequest(
            request,
            response,
            false,
            filesAdapter,
            options
        );
    }
}

export function getThumbnail(
    request: Request,
    response: Response,
    _: NextFunction,
    filesAdapter: FilesAdapter,
    options: BFastOptions
): void {
    if (isS3(filesAdapter) === true) {
        handleGetFileBySignedUrl(
            request,
            response,
            true,
            filesAdapter,
            options
        );
    } else {
        handleGetFileRequest(
            request,
            response,
            true,
            filesAdapter,
            options
        );
    }
}

export function getAllFiles(
    request: any, response: any, _: NextFunction, filesAdapter: FilesAdapter, options: BFastOptions
): void {
    listFiles({
            skip: isNaN(Number(request.query.skip)) ? 0: parseInt(request.query.skip),
            after: request.query.after ? request.query.after.toString(): '',
            size: isNaN(Number(request.query.size)) ? 20: parseInt(request.query.size),
            prefix: request.query.prefix ? request.query.prefix.toString() : '',
        },
        filesAdapter,
        options
    ).then(value => {
        response.json(value);
    }).catch(reason => {
        response.status(StatusCodes.EXPECTATION_FAILED).send({message: reason.toString()});
    });
}

export function multipartForm(
    request: Request,
    response: Response,
    _: NextFunction,
    filesAdapter: FilesAdapter,
    options: BFastOptions
): void {
    const contentType = request.get('content-type').split(';')[0].toString().trim();
    if (contentType !== 'multipart/form-data'.trim()) {
        response.status(StatusCodes.BAD_REQUEST).json({message: 'Accept only multipart request'});
        return;
    }
    const form = formidable({
        multiples: true,
        maxFileSize: 10 * 1024 * 1024 * 1024,
        keepExtensions: true
    });
    form.parse(request, async (err, fields, files) => {
        try {
            if (err) {
                response.status(StatusCodes.BAD_REQUEST).send(err.toString());
                return;
            }
            const urls = [];
            if (
                request && request.query && request.query.pn && request.query.pn.toString().trim().toLowerCase() === 'true'
            ) {
                request.body.context.storage = {preserveName: true};
            } else {
                request.body.context.storage = {preserveName: false};
            }
            for (const file of Object.values<any>(files)) {
                const fileMeta: { name: string, type: string } = {name: undefined, type: undefined};
                const regx = /[^0-9a-z.]/gi;
                fileMeta.name = file.name ? file.name : 'noname'
                    .toString()
                    .replace(regx, '');
                fileMeta.type = file.type;
                const result = await saveFromBuffer({
                        data: await promisify(readFile)(file.path),
                        type: fileMeta.type,
                        size: file.size,
                        name: fileMeta.name
                    },
                    request.body.context,
                    filesAdapter,
                    options);
                urls.push(result);
            }
            for (const f_key of Object.keys(fields)) {
                const fileMeta: { name: string, type: string } = {name: undefined, type: undefined};
                const regx = /[^0-9a-z.]/gi;
                fileMeta.name = f_key
                    .toString()
                    .replace(regx, '');
                // @ts-ignore
                fileMeta.type = mime.getType(f_key);
                const result = await saveFromBuffer({
                        data: Buffer.from(fields[f_key]),
                        type: fileMeta.type,
                        size: fields[f_key]?.length,
                        name: fileMeta.name
                    },
                    request.body.context,
                    filesAdapter,
                    options
                );
                urls.push(result);
            }
            response.status(StatusCodes.OK).json({urls});
        } catch (e) {
            console.log(e);
            response.status(StatusCodes.BAD_REQUEST).end(e.toString());
        }
    });
}

export function verifyApplicationId(
    request: any,
    response: any,
    next: any,
    options: BFastOptions
): void {
    const applicationId = request.body.applicationId;
    if (applicationId === options.applicationId) {
        request.body.context = {
            applicationId
        };
        next();
    } else {
        response.status(httpStatus.UNAUTHORIZED).json({message: 'unauthorized'});
    }
}

export function filePolicy(
    request: Request,
    response: Response,
    next: NextFunction,
    options: BFastOptions
): void {
    hasPermission(request.body.ruleId, request.body.context, options).then(value => {
        if (value === true) {
            next();
        } else {
            throw {message: 'You can\'t access this file'};
        }
    }).catch(reason => {
        response.status(StatusCodes.UNAUTHORIZED).send(reason);
    });
}

export function verifyRequestToken(
    request: Request,
    response: Response,
    next: NextFunction,
    options: BFastOptions
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
            // response.status(httpStatus.UNAUTHORIZED).json({message: 'bad token', code: -1});
        });
    }
    if (token && token !== '') {
        vToken(token);
    } else if (headerToken && headerToken !== '') {
        vToken(headerToken);
    } else {
        request.body.context.auth = false;
        request.body.context.uid = null;
        next();
    }
}

export function verifyMethod(request: any, response: any, next: any): void {
    if (request.method === 'POST') {
        next();
    } else {
        response.status(403).json({message: 'HTTP method not supported'});
    }
}

export function verifyBodyData(request: any, response: any, next: any): void {
    const body = request.body;
    if (!body) {
        response.status(httpStatus.BAD_REQUEST).json({message: 'require non empty rule blocks request'});
    } else if (Object.keys(body).length === 0) {
        response.status(httpStatus.BAD_REQUEST).json({message: 'require non empty rule blocks request'});
    } else {
        delete body.context;
        next();
    }
}

export function handleRuleBlocks(
    request: Request,
    response: Response,
    _: NextFunction,
    authAdapter: AuthAdapter,
    filesAdapter: FilesAdapter,
    options: BFastOptions,
): void {
    const body = request.body;
    try {
       devLog(JSON.stringify(body));
    } catch (e) {
        console.log(e);
    }
    const results: RuleResponse = {errors: {}};
    handleAuthenticationRule(
        body,
        results,
        authAdapter,
        options
    ).then(_1 => {
        return handleAuthorizationRule(
            body,
            results,
            options
        );
    }).then(_2 => {
        return handleCreateRules(
            body,
            results,
            options,
            null
        );
    }).then(_3 => {
        return handleUpdateRules(
            body,
            results,
            options,
            null
        );
    }).then(_4 => {
        return handleDeleteRules(
            body,
            results,
            options,
            null
        );
    }).then(_5 => {
        return handleQueryRules(
            body,
            results,
            options,
            null
        );
    }).then(_6 => {
        return handleBulkRule(
            body,
            results,
            options
        );
    }).then(_8 => {
        return handleStorageRule(
            body,
            results,
            authAdapter,
            filesAdapter,
            options
        );
    }).then(_9 => {
        if (!(results.errors && Object.keys(results.errors).length > 0)) {
            delete results.errors;
        }
        response.status(httpStatus.OK).json(results);
    }).catch(reason => {
        response.status(httpStatus.EXPECTATION_FAILED).json({message: reason.message ? reason.message : reason.toString()});
    });
}
