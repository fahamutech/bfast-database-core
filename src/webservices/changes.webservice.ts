import {functions} from 'bfast';
import {DatabaseController} from '../controllers/database.controller';
import {ChangesDocModel} from "../model/changes-doc.model";
import {SecurityController} from "../controllers/security.controller";
import {DatabaseAdapter} from "../adapters/database.adapter";
import {BFastDatabaseOptions} from "../bfast-database.option";

export class ChangesWebservice {

    constructor() {
    }

    changes(
        config: { applicationId: string, masterKey: string },
        prefix = '/',
        databaseController: DatabaseController,
        securityController: SecurityController,
        databaseAdapter: DatabaseAdapter
    ): { name: string, onEvent: any } {
        return functions().onEvent(
            `${prefix}v2/__changes__`,
            (request, response) => {
                if (request.auth.applicationId === config.applicationId) {
                    const bypassDomainVerification: boolean = config.masterKey === request.auth.masterKey;
                    if (request.body.pipeline && Array.isArray(request.body.pipeline) && request.body.domain) {
                        databaseController.changes(
                            request.body.domain,
                            request.body.pipeline,
                            databaseAdapter,
                            securityController,
                            (doc: ChangesDocModel) => {
                                response.emit({change: doc});
                            },
                            {
                                bypassDomainVerification,
                                resumeToken: request.body.resumeToken
                            }
                        ).then(_ => {
                            response.socket.on('disconnect', __1 => {
                                try {
                                    _.close();
                                } catch (_12) {
                                    console.log(_12);
                                }
                                console.log(`INFO : changes resource released, with reason --> ${__1}`);
                            });
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
    }

    // syncs(
    //     config: { applicationId: string, masterKey: string },
    //     prefix = '/',
    //     databaseController: DatabaseController,
    //     securityController: SecurityController,
    //     databaseAdapter: DatabaseAdapter,
    //     options: BFastDatabaseOptions
    // ): { name: string, onEvent: any } {
    //     return functions().onEvent(
    //         `${prefix}v2/__syncs__`,
    //         (request, response) => {
    //             if (request.auth.applicationId === config.applicationId) {
    //                 // const bypassDomainVerification: boolean = config.masterKey === request.auth.masterKey;
    //                 if (request.body.domain) {
    //                     databaseController.syncs(
    //                         request.body.domain,
    //                         databaseAdapter,
    //                         securityController,
    //                         // (value: ChangesDocModel) => {
    //                         //     response.emit({change: value});
    //                         // },
    //                         options
    //                     ).then(_ => {
    //                         response.socket.on('disconnect', __1 => {
    //                             try {
    //                                 _.close();
    //                             } catch (_12) {
    //                                 console.log(_12);
    //                             }
    //                             console.log(`INFO : syncs resource released, with reason --> ${__1}`);
    //                         });
    //                         response.emit({info: 'start listening for syncs'});
    //                     }).catch(reason => {
    //                         console.log(reason);
    //                         response.emit({error: reason.toString()});
    //                     });
    //                 } else {
    //                     response.emit({error: 'domain is required'});
    //                 }
    //             } else {
    //                 response.emit({error: 'unauthorized'});
    //             }
    //         }
    //     );
    // }

    // syncsEndpoint(){
    //     return functions().onEvent(
    //         '/syncs',
    //         (request, response) => {
    //             // console.log(request,'11++++++');
    //             // console.log(response.socket,'22+++++');
    //         }
    //     )
    // }

}
