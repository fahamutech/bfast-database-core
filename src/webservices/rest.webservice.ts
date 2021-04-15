import {BFast} from 'bfastnode';
import {RestController} from '../controllers/rest.controller';
import {BFastDatabaseOptions} from '../bfast-database.option';
import httpStatus from 'http-status-codes';

export class RestWebservice {

  constructor(private readonly restController: RestController,
              private readonly options: BFastDatabaseOptions) {
  }

  rulesV2(prefix = '/'): { path: string, onRequest: any, method: string } {
    return BFast.functions().onPostHttpRequest(`${prefix}v2`, [
      (request, response, next)=>this.restController.verifyMethod(request, response, next),
      (request, response, next)=>this.restController.verifyBodyData(request, response, next),
      (request, response, next)=>this.restController.verifyApplicationId(request, response, next),
      (request, response, next)=>this.restController.verifyToken(request, response, next),
      (request, response, next)=>this.restController.handleRuleBlocks(request, response, next)
    ]);
  }

  authJwk(){
    return BFast.functions().onHttpRequest(
        '/jwk',
        (request, response) => {
          if (this.options.rsaPublicKeyInJson){
            response.status(200).json(this.options.rsaPublicKeyInJson);
          }else {
            response.status(httpStatus.EXPECTATION_FAILED).json({message: 'fail to retrieve public key'});
          }
        }
    )
  }

}
