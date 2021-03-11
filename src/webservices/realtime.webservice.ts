import {BFast} from 'bfastnode';
import {DatabaseController} from '../controllers/database.controller';

let databaseController: DatabaseController;
const resources = {};

export class RealtimeWebservice {

    constructor(database: DatabaseController) {
        databaseController = database;
    }

    private _releaseResource(socketId) {
        console.log('INFO : changes released');
        if (resources && resources[socketId]) {
            try {
                resources[socketId].close();
            } catch (e) {
                console.log(e.toString());
            } finally {
                resources[socketId] = undefined;
            }
        }
    }

    changesV2(config: { applicationId: string, masterKey: string }, prefix = '/'): { name: string, onEvent: any } {
        return BFast.functions().onEvent(`${prefix}v2/__changes__`, (request, response) => {
                if (request.auth.applicationId === config.applicationId) {
                    const bypassDomainVerification: boolean = config.masterKey === request.auth.masterKey;
                    if (request.body.pipeline && Array.isArray(request.body.pipeline) && request.body.domain) {
                        const topic = (request.auth.topic && typeof request.auth.topic === 'string') ? request.auth.topic : request.auth.applicationId;
                        response.topic(topic).join();
                        const socketId = response.socket.id;
                        if (resources
                            && resources[socketId]
                            && typeof resources[socketId].isClosed() === 'function'
                            && resources[socketId].isClosed() === false) {
                            console.log('INFO : already listening for changes');
                        } else {
                            databaseController.changes(request.body.domain, request.body.pipeline, doc => {
                                response.topic(topic).announce({change: doc});
                            }, {
                                bypassDomainVerification,
                                resumeToken: request.body.resumeToken
                            }).then(_ => {
                                resources[socketId] = _;
                                response.topic(topic).announce({info: 'start listening for changes'});
                            }).catch(reason => {
                                response.topic(topic).announce({error: reason.toString()});
                            });
                        }
                        response.socket.on('disconnect', _ => {
                            this._releaseResource(socketId);
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
