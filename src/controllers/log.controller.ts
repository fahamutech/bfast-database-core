import {BFastDatabaseOptions} from '../bfast-database.option';

let config: BFastDatabaseOptions;

export class LogController {
    constructor(private readonly restConfig: BFastDatabaseOptions) {
        config = this.restConfig;
    }

    print(e: any) {
        if (config.logs === true) {
            console.log(e);
        }
    }
}
