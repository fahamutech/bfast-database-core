import httpStatus, {StatusCodes} from 'http-status-codes';
import {SecurityController} from './security.controller';
import {RulesController} from './rules.controller';
import {RuleResponse} from '../model/rules.model';
import {StorageController} from './storage.controller';
import {AuthController} from './auth.controller';
import {BFastDatabaseOptions} from '../bfast-database.option';
import formidable from 'formidable';
import {readFile} from 'fs';
import {promisify} from "util";
import mime from 'mime'

export class RestController {
    constructor(private readonly securityController: SecurityController,
                private readonly authController: AuthController,
                private readonly storageController: StorageController,
                private readonly rulesController: RulesController,
                private readonly config: BFastDatabaseOptions) {
    }

    getFile(request: any, response: any, _: any): void {
        if (request?.method?.toString()?.toLowerCase() === 'head') {
            this.storageController.fileInfo(request, response);
        } else if (this.storageController.isS3() === true) {
            this.storageController.handleGetFileBySignedUrl(request, response, false);
        } else {
            this.storageController.handleGetFileRequest(request, response, false);
        }
    }

    getThumbnail(request: any, response: any, _: any): void {
        if (this.storageController.isS3() === true) {
            this.storageController.handleGetFileBySignedUrl(request, response, true);
        } else {
            this.storageController.handleGetFileRequest(request, response, true);
        }
    }

    getAllFiles(request: any, response: any, _: any): void {
        this.storageController.listFiles({
            skip: request.query.skip ? request.query.skip as number : 0,
            after: request.query.after,
            size: request.query.size ? request.query.size as number : 20,
            prefix: request.query.prefix ? request.query.prefix : '',
        }).then(value => {
            response.json(value);
        }).catch(reason => {
            response.status(StatusCodes.EXPECTATION_FAILED).send({message: reason.toString()});
        });
    }

    multipartForm(request: any, response: any, _: any): void {
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
                // console.log(fields, '--------> parsed fields');
                // console.log(files, '--------> parsed files');
                const urls = [];
                if (request && request.query && request.query.pn && request.query.pn.trim().toLowerCase() === 'true') {
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
                    const result = await this.storageController.saveFromBuffer({
                        data: await promisify(readFile)(file.path),
                        type: fileMeta.type,
                        size: file.size,
                        name: fileMeta.name
                    }, request.body.context);
                    urls.push(result);
                }
                for (const f_key of Object.keys(fields)) {
                    const fileMeta: { name: string, type: string } = {name: undefined, type: undefined};
                    const regx = /[^0-9a-z.]/gi;
                    fileMeta.name = f_key
                        .toString()
                        .replace(regx, '');

                    fileMeta.type = mime.getType(f_key);
                    const result = await this.storageController.saveFromBuffer({
                        data: Buffer.from(fields[f_key]),
                        type: fileMeta.type,
                        size: fields[f_key]?.length,
                        name: fileMeta.name
                    }, request.body.context);
                    urls.push(result);
                }
                response.status(StatusCodes.OK).json({urls});
            } catch (e) {
                console.log(e);
                response.status(StatusCodes.BAD_REQUEST).end(e.toString());
            }
        });
    }

    verifyApplicationId(request: any, response: any, next: any): void {
        const applicationId = request.body.applicationId;
        if (applicationId === this.config.applicationId) {
            request.body.context = {
                applicationId
            };
            next();
        } else {
            response.status(httpStatus.UNAUTHORIZED).json({message: 'unauthorized'});
        }
    }

    filePolicy(request: any, response: any, next: any): void {
        this.authController.hasPermission(request.body.ruleId, request.body.context).then(value => {
            if (value === true) {
                next();
            } else {
                throw {message: 'You can\'t access this file'};
            }
        }).catch(reason => {
            response.status(StatusCodes.UNAUTHORIZED).send(reason);
        });
    }

    verifyToken(request: any, response: any, next: any): void {
        const token = request.body.token;
        const headerToken = request.headers['x-bfast-token'];
        const masterKey = request.body.masterKey;

        if (masterKey === this.config.masterKey) {
            request.body.context.auth = true;
            request.body.context.uid = "masterKey";
            request.body.context.masterKey = masterKey;
            request.body.context.useMasterKey = true;
            next();
            return;
        }

        request.body.context.useMasterKey = false;
        const vToken = () => {
            this.securityController.verifyToken(token).then(value => {
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
            vToken();
        } else if (headerToken && headerToken !== '') {
            vToken();
        } else {
            request.body.context.auth = false;
            request.body.context.uid = null;
            next();
        }
    }

    verifyMethod(request: any, response: any, next: any): void {
        if (request.method === 'POST') {
            next();
        } else {
            response.status(403).json({message: 'HTTP method not supported'});
        }
    }

    verifyBodyData(request: any, response: any, next: any): void {
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

    handleRuleBlocks(request: any, response: any, _: any): void {
        const body = request.body;
        const results: RuleResponse = {errors: {}};
        this.rulesController.handleAuthenticationRule(body, results).then(_1 => {
            return this.rulesController.handleAuthorizationRule(body, results);
        }).then(_2 => {
            return this.rulesController.handleCreateRules(body, results);
        }).then(_3 => {
            return this.rulesController.handleUpdateRules(body, results);
        }).then(_4 => {
            return this.rulesController.handleDeleteRules(body, results);
        }).then(_5 => {
            return this.rulesController.handleQueryRules(body, results);
        }).then(_6 => {
            return this.rulesController.handleBulkRule(body, results);
        }).then(_8 => {
            return this.rulesController.handleStorageRule(body, results);
        }).then(_9 => {
            if (!(results.errors && Object.keys(results.errors).length > 0)) {
                delete results.errors;
            }
            response.status(httpStatus.OK).json(results);
        }).catch(reason => {
            response.status(httpStatus.EXPECTATION_FAILED).json({message: reason.message ? reason.message : reason.toString()});
        });
        //     .then(_7 => {
        //     return this.rulesController.handleAggregationRules(body, results);
        // })
    }

}
