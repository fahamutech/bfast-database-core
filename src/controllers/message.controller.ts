import {BFastDatabaseConfigAdapter} from '../bfast.config';

let config: BFastDatabaseConfigAdapter;

export class MessageController {
    constructor(private readonly restConfig: BFastDatabaseConfigAdapter) {
        config = this.restConfig;
    }

    print(e: any) {
        if (config.logs === true) {
            console.log(e);
        }
    }
}
