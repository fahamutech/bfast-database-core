import {RuleResponse} from "../models/rule-response";
import {AuthAdapter} from "../adapters/auth.adapter";
import {BFastOptions} from "../bfast-option";
import {signIn, signUp} from "./auth";
import {RuleContext} from "../models/rule-context";

function sanitizeRuleResponse(ruleResponse: RuleResponse) {
    if (!ruleResponse.auth) ruleResponse.auth = {};
    return ruleResponse;
}

async function authSignUp(
    data, ruleResponse: RuleResponse, authAdapter: AuthAdapter, context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    const signUpResponse = await signUp(data, authAdapter, context, options);
    ruleResponse = sanitizeRuleResponse(ruleResponse);
    ruleResponse.auth.signUp = signUpResponse;
    return ruleResponse
}

async function authSignIn(
    data, ruleResponse: RuleResponse, authAdapter: AuthAdapter, context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    const signInResponse = await signIn(data, authAdapter, context, options);
    ruleResponse = sanitizeRuleResponse(ruleResponse);
    ruleResponse.auth.signIn = signInResponse;
    return ruleResponse
}

export async function authRule(
    action: string, data: any, ruleResponse: RuleResponse, authAdapter: AuthAdapter,
    context: RuleContext, options: BFastOptions
): Promise<RuleResponse> {
    if (action === 'signUp') return authSignUp(data, ruleResponse, authAdapter, context, options);
    if (action === 'signIn') return authSignIn(data, ruleResponse, authAdapter, context, options);
    if (action === 'reset') throw {message: 'Reset not supported yet'};
}



