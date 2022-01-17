import EventEmitter from "events";
import {ChangesModel} from "../models/changes.model";
import {Const} from "../utils/const";

export class AppEventsFactory {
    readonly eventEmitter;
    private static instance: AppEventsFactory;

    private constructor() {
        this.eventEmitter = new EventEmitter();
        this.eventEmitter.setMaxListeners(100000000);
    }

    public static getInstance(): AppEventsFactory {
        if (!AppEventsFactory.instance) {
            AppEventsFactory.instance = new AppEventsFactory();
        }
        return AppEventsFactory.instance;
    }

    public sub(eventName: string, handler: (doc: ChangesModel) => void) {
        this.eventEmitter.on(eventName, handler);
    }

    public unSub(evenName: string, handler: (doc: ChangesModel) => void) {
        this.eventEmitter.removeListener(evenName, handler);
    }

    public pub(eventName: string, doc: ChangesModel) {
        this.eventEmitter.emit(eventName, doc);
    }

    public eventName(projectId: string, domain: string): string {
        return Const.DB_CHANGES_EVENT.concat(domain).concat(projectId);
    }

    public connected(eventName: string): number {
        return this.eventEmitter.listenerCount(eventName);
    }
}
