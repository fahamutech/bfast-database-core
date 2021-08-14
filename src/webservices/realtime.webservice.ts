import {BFast} from 'bfastnode';
import {DatabaseController} from '../controllers/database.controller';

export class RealtimeWebservice {

    constructor(private readonly databaseController: DatabaseController) {
    }

    changesV2(config: { applicationId: string, masterKey: string }, prefix = '/'): { name: string, onEvent: any } {
        return BFast.functions().onEvent(`${prefix}v2/__changes__`, (request, response) => {
                if (request.auth.applicationId === config.applicationId) {
                    const bypassDomainVerification: boolean = config.masterKey === request.auth.masterKey;
                    if (request.body.pipeline && Array.isArray(request.body.pipeline) && request.body.domain) {
                        this.databaseController.changes(request.body.domain, request.body.pipeline, doc => {
                            response.emit({change: doc});
                        }, {
                            bypassDomainVerification,
                            resumeToken: request.body.resumeToken
                        }).then(_ => {
                            response.socket.on('disconnect', __1 => {
                                try{
                                    _.close();
                                }catch(_12){
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

}
