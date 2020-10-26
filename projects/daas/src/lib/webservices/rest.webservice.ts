import {BFast} from 'bfastnode';
import {RestController} from '../controllers/rest.controller';

export class RestWebservice {

  constructor(private readonly restController: RestController) {
  }

  rulesV2(): { path: string, onRequest: any, method: string } {
    return BFast.functions().onPostHttpRequest('/v2', [
      this.restController.verifyMethod,
      this.restController.verifyBodyData,
      this.restController.verifyApplicationId,
      this.restController.verifyToken,
      this.restController.handleRuleBlocks
    ]);
  }

}
