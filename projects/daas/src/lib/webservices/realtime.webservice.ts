import {BFast} from 'bfastnode';
import {DatabaseController} from '../controllers/database.controller';

export class RealtimeWebservice {

  constructor(private readonly databaseController: DatabaseController) {
  }

  changesV2(config: { applicationId: string, masterKey: string }): { name: string, onEvent: any } {
    return BFast.functions().onEvent('/v2/__changes__',
      (request, response) => {
        if (request.auth.applicationId === config.applicationId) {
          const bypassDomainVerification: boolean = config.masterKey === request.auth.masterKey;
          if (request.body.pipeline && Array.isArray(request.body.pipeline) && request.body.domain) {
            this.databaseController.changes(request.body.domain, request.body.pipeline, doc => {
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
  }

}
