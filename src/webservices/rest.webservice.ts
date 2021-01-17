import {BFast} from 'bfastnode';
import {RestController} from '../controllers/rest.controller';

let restController: RestController;

export class RestWebservice {

  constructor(rest: RestController) {
    restController = rest;
  }

  rulesV2(prefix = '/'): { path: string, onRequest: any, method: string } {
    return BFast.functions().onPostHttpRequest(`${prefix}v2`, [
      restController.verifyMethod,
      restController.verifyBodyData,
      restController.verifyApplicationId,
      restController.verifyToken,
      restController.handleRuleBlocks
    ]);
  }

}
