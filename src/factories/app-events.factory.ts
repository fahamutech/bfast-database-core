import EventEmitter from "events";
import {ChangesModel} from "../models/changes.model";

export class AppEventsFactory {
    readonly eventEmitter ;
    private static instance: AppEventsFactory;

    private constructor() {
        this.eventEmitter = new EventEmitter();
        this.eventEmitter.setMaxListeners(100000);
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

    public connected(eventName:string): number{
        return this.eventEmitter.listenerCount(eventName);
    }
}
