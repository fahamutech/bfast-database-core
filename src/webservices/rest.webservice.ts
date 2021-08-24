import {functions} from 'bfast';
import {RestController} from '../controllers/rest.controller';
import {BFastDatabaseOptions} from '../bfast-database.option';
import httpStatus from 'http-status-codes';

export class RestWebservice {

    constructor(private readonly restController: RestController,
                private readonly options: BFastDatabaseOptions) {
    }

    rulesV2(prefix = '/'): { path: string, onRequest: any, method: string } {
        return functions().onPostHttpRequest(`${prefix}v2`, [
            (rq, rs, n) => this.restController.verifyMethod(rq, rs, n),
            (rq, rs, n) => this.restController.verifyBodyData(rq, rs, n),
            (rq, rs, n) => this.restController.verifyApplicationId(rq, rs, n),
            (rq, rs, n) => this.restController.verifyToken(rq, rs, n),
            (rq, rs, n) => this.restController.handleRuleBlocks(rq, rs, n)
        ]);
    }

    authJwk() {
        return functions().onHttpRequest(
            '/jwk',
            (request, response) => {
                if (this.options.rsaPublicKeyInJson) {
                    response.status(200).json(this.options.rsaPublicKeyInJson);
                } else {
                    response.status(httpStatus.EXPECTATION_FAILED).json({message: 'fail to retrieve public key'});
                }
            }
        )
    }

}
