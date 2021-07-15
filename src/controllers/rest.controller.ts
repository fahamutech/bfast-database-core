import httpStatus, {StatusCodes} from 'http-status-codes';
import {SecurityController} from './security.controller';
import {RulesController} from './rules.controller';
import {RuleResponse} from '../model/rules.model';
import {StorageController} from './storage.controller';
import {AuthController} from './auth.controller';
import {UpdateRuleController} from './update.rule.controller';
import {PassThrough} from 'stream';
import {BFastDatabaseOptions} from '../bfast-database.option';

import formidable from 'formidable';
import {LogController} from './log.controller';

let restSecurity: SecurityController;
let restAuthController: AuthController;
let restStorageController: StorageController;
let restConfig: BFastDatabaseOptions;

export class RestController {
    constructor(_restSecurity: SecurityController,
                _restAuthController: AuthController,
                _restStorageController: StorageController,
                _restConfig: BFastDatabaseOptions) {
        restSecurity = _restSecurity;
        restAuthController = _restAuthController;
        restStorageController = _restStorageController;
        restConfig = _restConfig;
    }

    getFile(request: any, response: any, _: any): void {
        if (restStorageController.isS3() === true) {
            restStorageController.handleGetFileBySignedUrl(request, response, !!request.query.thumbnail);
            return;
        } else {
            restStorageController.getFileData(request, response, false);
            return;
        }
    }

    getThumbnail(request: any, response: any, _: any): void {
        if (restStorageController.isS3() === true) {
            restStorageController.handleGetFileBySignedUrl(request, response, true);
            return;
        } else {
            restStorageController.getFileData(request, response, true);
            return;
        }
    }

    getAllFiles(request: any, response: any, _: any): void {
        restStorageController.listFiles({
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
        const form = formidable({
            multiples: true,
            maxFileSize: 10 * 1024 * 1024 * 1024,
            keepExtensions: true
        });
        const passThrough = new PassThrough();
        const fileMeta: { name: string, type: string } = {name: undefined, type: undefined};
        form.onPart = part => {
            if (!part.filename) {
                form.handlePart(part);
                return;
            }
            const regx = /[^0-9a-z.]/gi;
            fileMeta.name = part.filename
                .toString()
                .replace(regx, '');
            fileMeta.type = part.mime;
            part.on('data', (buffer) => {
                passThrough.write(buffer);
            });
            part.on('end', () => {
                passThrough.end();
            });
        };
        form.parse(request, async (err, _0, _1) => {
            try {
                if (err) {
                    response.status(StatusCodes.BAD_REQUEST).send(err.toString());
                    return;
                }
                const urls = [];
                if (request && request.query && request.query.pn && request.query.pn.toString() === 'true') {
                    request.body.context.storage = {preserveName: true};
                } else {
                    request.body.context.storage = {preserveName: false};
                }
                const result = await restStorageController.saveFromBuffer({
                    data: passThrough as any,
                    type: fileMeta.type,
                    filename: fileMeta.name
                }, request.body.context);
                urls.push(result);
                response.status(StatusCodes.OK).json({urls});
            } catch (e) {
                console.log(e);
                response.status(StatusCodes.BAD_REQUEST).end(e.toString());
            }
        });
        return;
    }

    verifyApplicationId(request: any, response: any, next: any): void {
        const applicationId = request.body.applicationId;
        if (applicationId === restConfig.applicationId) {
            request.body.context = {
                applicationId
            };
            next();
        } else {
            response.status(httpStatus.UNAUTHORIZED).json({message: 'unauthorized'});
        }
    }

    filePolicy(request: any, response: any, next: any): void {
        restAuthController.hasPermission(request.body.ruleId, request.body.context).then(value => {
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

        if (masterKey === restConfig.masterKey) {
            request.body.context.auth = true;
            request.body.context.uid = "masterKey";
            request.body.context.masterKey = masterKey;
            request.body.context.useMasterKey = true;
            next();
            return;
        }

        request.body.context.useMasterKey = false;
        if(token && token !== ''){
            restSecurity.verifyToken(token).then(value => {
                request.body.context.auth = true;
                request.body.context.uid = value.uid;
                next();
            }).catch(_ => {
                request.body.context.auth = false;
                request.body.context.uid = null;
                next();
                // response.status(httpStatus.UNAUTHORIZED).json({message: 'bad token', code: -1});
            });
        }else if(headerToken && headerToken!==''){
            restSecurity.verifyToken(headerToken).then(value => {
                request.body.context.auth = true;
                request.body.context.uid = value.uid;
                next();
            }).catch(_ => {
                request.body.context.auth = false;
                request.body.context.uid = null;
                next();
                // response.status(httpStatus.UNAUTHORIZED).json({message: 'bad token', code: -1});
            });
        }else {
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
        const rulesController = new RulesController(new UpdateRuleController(), new LogController(restConfig), restConfig);
        rulesController.handleIndexesRule(body, results).then(__ => {
            return rulesController.handleAuthenticationRule(body, results);
        }).then(_1 => {
            return rulesController.handleAuthorizationRule(body, results);
        }).then(_2 => {
            return rulesController.handleCreateRules(body, results);
        }).then(_3 => {
            return rulesController.handleUpdateRules(body, results);
        }).then(_4 => {
            return rulesController.handleDeleteRules(body, results);
        }).then(_5 => {
            return rulesController.handleQueryRules(body, results);
        }).then(_6 => {
            return rulesController.handleTransactionRule(body, results);
        }).then(_7 => {
            return rulesController.handleAggregationRules(body, results);
        }).then(_8 => {
            return rulesController.handleStorageRule(body, results);
        }).then(_9 => {
            if (!(results.errors && Object.keys(results.errors).length > 0)) {
                delete results.errors;
            }
            response.status(httpStatus.OK).json(results);
        }).catch(reason => {
            response.status(httpStatus.EXPECTATION_FAILED).json({message: reason.message ? reason.message : reason.toString()});
        });
    }

}
