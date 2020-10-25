import {BFast} from "bfastnode";
import {getDatabaseController} from "./webServicesConfig";
import {BfastConfig} from "../bfast.config";

const databaseController = getDatabaseController();
export const domainChangesListener = BFast.functions().onEvent('/v2/__changes__',
    (request, response) => {
        if (request.auth.applicationId === BfastConfig.getInstance().applicationId) {
            const bypassDomainVerification: boolean
                = BfastConfig.getInstance().masterKey === request.auth.masterKey;
            if (request.body.pipeline && Array.isArray(request.body.pipeline) && request.body.domain) {
                databaseController.changes(request.body.domain, request.body.pipeline, doc => {
                    response.emit({change: doc});
                }, {
                    bypassDomainVerification
                }).then(_ => {
                    response.emit({info: 'start listening for changes'});
                }).catch(reason => {
                    response.emit({error: reason.toString()});
                });
            } else {
                response.emit({error: 'pipeline/domain is required'});
            }
        } else {
            response.emit({error: 'unauthorized'});
        }
    }
);
