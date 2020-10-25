import {BFast} from "bfastnode";
import {getRestController} from "./webServicesConfig";

const restController = getRestController();

/**
 * rules http end-point
 */
export const bfastRulesEndpoint = BFast.functions().onPostHttpRequest('/v2', [
    restController.verifyMethod,
    restController.verifyBodyData,
    restController.applicationId,
    restController.verifyToken,
    restController.handleRuleBlocks
]);

