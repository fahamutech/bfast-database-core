import {ChangesDocModel} from "../models/changes-doc.model";
import {DatabaseChangesOptions} from "../models/database-changes-options";
import {ChangesModel} from "../models/changes.model";
import {AppEventsFactory} from "../factories/app-events";
import {handleDomainValidation, sanitize4User} from "../controllers/database";

export async function changes(
    domain: string, projectId: string, pipeline: any[], listener: (doc: ChangesDocModel) => void,
    options: DatabaseChangesOptions = {bypassDomainVerification: false, resumeToken: undefined}
): Promise<{ close: () => void }> {
    if (options && options.bypassDomainVerification === false) await handleDomainValidation(domain);
    const _listener = (doc: ChangesModel) => {
        switch (doc.operationType) {
            case 'create':
                listener({
                    name: 'create',
                    snapshot: sanitize4User(doc.fullDocument, [])
                });
                return;
            case 'update':
                listener({
                    name: 'update',
                    snapshot: sanitize4User(doc.fullDocument, [])
                });
                return;
            case 'delete':
                listener({
                    name: 'delete',
                    snapshot: sanitize4User(doc.fullDocument, [])
                });
                return;
        }
    }
    const appEventInst = AppEventsFactory.getInstance();
    const eventName = appEventInst.eventName(projectId, domain);
    appEventInst.sub(eventName, _listener);
    return {
        close: () => appEventInst.unSub(eventName, _listener)
    }
}
