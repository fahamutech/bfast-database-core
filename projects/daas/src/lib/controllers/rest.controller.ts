import * as httpStatus from "http-status-codes";
import {BAD_REQUEST, EXPECTATION_FAILED, OK, UNAUTHORIZED} from "http-status-codes";
import {SecurityController} from "./security.controller";
import {RulesController} from "./rules.controller";
import {BfastConfig} from "../bfast.config";
import {RuleResponse} from "../model/Rules";
import {StorageController} from "./storage.controller";
import {AuthController} from "./auth.controller";
import {UpdateRuleController} from "./update.rule.controller";
import {PassThrough} from "stream";

const formidable = require('formidable');

let _storage: StorageController;
let _security: SecurityController;
let _authController: AuthController;

export class RestController {
    constructor(private readonly security: SecurityController,
                private readonly authController: AuthController,
                private readonly storage: StorageController) {
        _storage = this.storage;
        _authController = this.authController
        _security = this.security;
    }

    getFile(request: any, response: any, _: any) {
        if (_storage.isS3() === true) {
            _storage.handleGetFileBySignedUrl(request, response, false);
            return;
        } else {
            _storage.getFileData(request, response, false);
            return;
        }
    }

    getThumbnail(request: any, response: any, _: any) {
        if (_storage.isS3() === true) {
            _storage.handleGetFileBySignedUrl(request, response, true);
            return;
        } else {
            _storage.getFileData(request, response, true);
            return;
        }
    }

    getAllFiles(request: any, response: any, _: any) {
        _storage.listFiles({
            skip: request.query.skip ? <number>request.query.skip : 0,
            after: request.query.after,
            size: request.query.size ? <number>request.query.size : 20,
            prefix: request.query.prefix ? request.query.prefix : '',
        }).then(value => {
            response.json(value);
        }).catch(reason => {
            response.status(EXPECTATION_FAILED).send({message: reason.toString()});
        });
    }

    multipartForm(request: any, response: any, _: any) {
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
                return
            }
            fileMeta.name = part.filename
                .toString()
                .replace('_','')
                .replace('-','')
                .replace('*','')
                .replace('#','')
                .replace('(','')
                .replace(')','')
                .replace('>','')
                .replace('<','')
                .replace('@','');
            fileMeta.type = part.mime
            part.on('data', function (buffer) {
                passThrough.write(buffer);
            })
            part.on('end', function () {
                passThrough.end();
            })
        }
        form.parse(request, async (err, _0, _1) => {
            try {
                if (err) {
                    response.status(BAD_REQUEST).send(err.toString());
                    return;
                }
                const urls = [];
                const result = await _storage.saveFromBuffer({
                    data: passThrough as any,
                    type: fileMeta.type,
                    filename: fileMeta.name
                }, request.body.context);
                urls.push(result);
                response.status(OK).json({urls});
            } catch (e) {
                console.log(e);
                response.status(BAD_REQUEST).end(e.toString());
            }
        });
        return;
    }

    applicationId(request: any, response: any, next: any) {
        const applicationId = request.body.applicationId
        if (applicationId === BfastConfig.getInstance().applicationId) {
            request.body.context = {
                applicationId
            }
            next();
        } else {
            response.status(httpStatus.UNAUTHORIZED).json({message: 'unauthorized'})
        }
    }

    filePolicy(request: any, response: any, next: any) {
        _authController.hasPermission(request.body.ruleId, request.body.context).then(value => {
            if (value === true) {
                next();
            } else {
                throw {message: "You can't access this file"};
            }
        }).catch(reason => {
            response.status(UNAUTHORIZED).send(reason);
        });
    }

    verifyToken(request: any, response: any, next: any) {
        const token = request.body.token;
        const masterKey = request.body.masterKey;

        if (masterKey === BfastConfig.getInstance().masterKey) {
            request.body.context.auth = true;
            request.body.context.uid = `masterKey_${masterKey}`;
            request.body.context.masterKey = masterKey;
            request.body.context.useMasterKey = true;
            next();
            return;
        }

        request.body.context.useMasterKey = false;
        if (!token) {
            request.body.context.auth = false;
            request.body.context.uid = null;
            next();
        } else {
            _security.verifyToken<{ uid: string }>(token).then(value => {
                request.body.context.auth = true;
                request.body.context.uid = value.uid;
                next();
            }).catch(_ => {
                response.status(httpStatus.UNAUTHORIZED).json({message: 'bad token'});
            });
        }
    }

    verifyMethod(request: any, response: any, next: any) {
        if (request.method === 'POST') {
            next();
        } else {
            response.status(403).json({message: 'HTTP method not supported'})
        }
    }

    verifyBodyData(request: any, response: any, next: any) {
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

    handleRuleBlocks(request: any, response: any, next: any) {
        const body = request.body;
        const results: RuleResponse = {errors: {}};
        const rulesController = new RulesController(BfastConfig.getInstance(),
            new UpdateRuleController());
        rulesController.handleIndexesRule(body, results).then(_ => {
            return rulesController.handleAuthenticationRule(body, results);
        }).then(_ => {
            return rulesController.handleAuthorizationRule(body, results);
        }).then(_ => {
            return rulesController.handleCreateRules(body, results);
        }).then(_ => {
            return rulesController.handleUpdateRules(body, results);
        }).then(_ => {
            return rulesController.handleDeleteRules(body, results);
        }).then(_ => {
            return rulesController.handleQueryRules(body, results);
        }).then(_ => {
            return rulesController.handleTransactionRule(body, results);
        }).then(_ => {
            return rulesController.handleAggregationRules(body, results);
        }).then(_ => {
            return rulesController.handleStorageRule(body, results);
        }).then(_ => {
            if (!(results.errors && Object.keys(results.errors).length > 0)) {
                delete results.errors;
            }
            response.status(httpStatus.OK).json(results);
        }).catch(reason => {
            response.status(httpStatus.EXPECTATION_FAILED).json({message: reason.message ? reason.message : reason.toString()})
        });
    }

}
