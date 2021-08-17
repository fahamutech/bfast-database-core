import EventEmitter from "events";
import {ChangesModel} from "../model/changes.model";

export class AppEventsFactory {
    readonly eventEmitter = new EventEmitter();
    private static instance: AppEventsFactory;

    private constructor() {
        this.eventEmitter.setMaxListeners(100000);
    }

    public static getInstance(): AppEventsFactory {
        if (!AppEventsFactory.instance) {
            AppEventsFactory.instance = new AppEventsFactory();
        }
        return AppEventsFactory.instance;
    }

    public sub(eventName: string, handler: (doc: ChangesModel) => void) {
        // console.log(this.eventEmitter.listenerCount(eventName),'----> max listener');
        this.eventEmitter.on(eventName, doc => {
            handler(doc);
        });
    }

    public unSub(evenName: string, handler: (arg: any) => void) {
        this.eventEmitter.removeListener(evenName, handler);
    }

    public pub(eventName: string, doc: ChangesModel) {
        this.eventEmitter.emit(eventName, doc);
    }
}
