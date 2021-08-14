import {BFastDatabaseOptions} from '../bfast-database.option';

export class LogController {
    constructor(private readonly config: BFastDatabaseOptions) {
    }

    print(e: any) {
        if (this.config.logs === true) {
            console.log(e);
        }
    }
}
